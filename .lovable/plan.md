

## Plan: Fix Monitoring Edge Function + Overhaul Monitoring UX/UI/Performance

### Root cause of "Edge Function returned a non-2xx status code"

The `agromonitoring-polygon` edge function tries to parse the plot's `coordinates` field as a multi-point polygon by splitting on a single space:

```ts
plot.coordinates.split(' ').map(pair => { const [lat, lng] = pair.split(',').map(Number); return [lng, lat]; })
```

But all plots in the DB store a single point like `"22.306612, -98.659598"`. After splitting by space, we get two malformed pieces (`"22.306612,"` and `"-98.659598"`), producing a single broken pair. The Agromonitoring API rejects with **"a LinearRing of coordinates needs to have four or more positions"** → 500 status → "non-2xx" error in the UI.

The fallback path that builds a square polygon from `latitude`/`longitude` works, but is never reached because `plot.coordinates` is truthy.

---

### Part 1 — Fix the polygon creation (immediate bugfix)

**File:** `supabase/functions/agromonitoring-polygon/index.ts`

Robust parser:
1. Try to parse `coordinates` as a multi-point string. Accept both `lat,lng lat,lng` (space-separated) **and** `lat, lng; lat, lng` patterns. Strip whitespace on each piece.
2. If parsing yields fewer than 3 distinct points, **fall back to lat/lng** and build a square polygon — using `area` (in hectares) to compute a realistic side length instead of the hard-coded `0.005°` offset. A 10 ha plot → ~316m square; convert to degrees using `√(area_ha × 10000) / 111320`.
3. Always close the ring (first === last).
4. Log the generated GeoJSON before posting to Agromonitoring for easier debugging.

Also surface the real error message back to the client (currently swallowed as "Internal server error") so future failures are visible.

### Part 2 — Performance: why the section is slow

Current waterfall on `/plots`: Plots query → Photos query → Investments query → Species query → for each plot card, **3 sequential queries** inside `AgromonitoringMonitor` (polygon → satellite → weather), plus PlotMap fires its own Cecil AOI + satellite queries. With 10 plots that's ~60 sequential round-trips.

**Fixes:**
- **Batch the Agromonitoring queries**: one query loads all polygons, all latest satellite rows, and all latest weather rows by plot list. Pass them down as props to `AgromonitoringMonitor` and `PlotMap` (no per-card queries).
- **Lazy-mount maps**: render PlotMap only when the card scrolls into view (`IntersectionObserver`). Today all 10 maps initialize on first paint — Leaflet creates 10 map instances + tile layers immediately.
- **Defer Agromonitoring section**: only mount when the user expands it (`<details>` / collapsible). Most users never scroll to it.
- **Cache aggressively**: bump satellite/weather staleTime to 10 min, polygons to 30 min (data updates ~1×/day).
- Result: initial paint goes from ~60 queries to ~5; map memory drops dramatically.

### Part 3 — UX/UI overhaul of the monitoring experience

Reposition this as a **corporate environmental-impact dashboard** worth paying for. Three deliverables:

#### 3a. New `EnvironmentalImpactCard` (corporate-grade summary, top of each plot)
Replace the demo gradient placeholder with a clean impact tile showing:
- **CO₂ captured** (live counter, computed from `total_plants × species.carbon_capture_per_plant × maturation_progress`)
- **Active hectares restored**
- **NDVI vs. baseline** (mini sparkline, last 90 days) — green if improving
- **Days monitored** + last satellite pass date
- Single "Descargar reporte" button (PDF/CSV stub for future)

Visual: dark card with subtle gradient accent, large numbers, compact units. Apple-Keynote feel.

#### 3b. Time-slider on the satellite map
Add a **temporal NDVI viewer** on the plot map:
- Bottom slider showing months across the last 12–24 months.
- Dragging swaps the map's NDVI tile (using existing Agromonitoring `image.tile.ndvi` URLs already stored in `agromonitoring_data.satellite_image_url`).
- "Play ▶" button auto-advances every 700ms — visualizes vegetation evolution across seasons. This is the "watch the land change over time" feature.
- Uses Leaflet `imageOverlay` clipped to the polygon bounds; no new dependencies.

#### 3c. Cleaner Monitoring tab on `/plots`
- Replace the always-expanded `AgromonitoringMonitor` block with a **collapsible section** ("Ver datos satelitales y clima") closed by default — drastically faster initial load and less visual noise.
- When opened, show 3 clean tabs: **Vegetación · Clima · Suelo**. Each tab loads its own data on demand.
- Replace small grey indicator boxes with proper KPI cards (icon + label + value + trend chevron + colored background based on health threshold).
- Add a "Última pasada satelital: hace 3 días · 12% nubes" timestamp line — builds trust.

#### 3d. Map provider polish
PlotMap already uses Leaflet + Esri satellite. Add:
- **Layer toggle** in top-right: Satélite / Mapa / Híbrido (Esri + labels).
- **Fullscreen button**.
- **Scale bar** (km).
- **Smooth fly-to** when expanding a card.
- Polygon outlined in semi-transparent green (`#22c55e80`) showing the actual plot boundary (from `agromonitoring_polygons.geo_json` if available; otherwise the computed square).

### Part 4 — Demo mode & error handling

- If the polygon-creation call fails (Agromonitoring rate limit, invalid coords), the UI should keep showing the new EnvironmentalImpactCard with computed-from-DB metrics (carbon, hectares, plants) instead of a sad "demo" badge. The corporate visitor should never see "demo mode" — they should always see real impact numbers.
- Add a small "Datos satelitales no disponibles" inline message only inside the collapsible section.

---

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/agromonitoring-polygon/index.ts` | Fix coordinate parsing, area-based square, return real error |
| `src/lib/agromonitoring.ts` | Add `getMonitoringDataForPlots(plotIds[])` batch fetcher |
| `src/pages/Plots.tsx` | Single batch query for monitoring data; pass as props; collapsible monitoring section |
| `src/components/PlotMap.tsx` | Lazy mount via IntersectionObserver; layer toggle; fullscreen; scale bar; polygon overlay; **time-slider for NDVI tiles** |
| `src/components/monitoring/AgromonitoringMonitor.tsx` | Accept polygon/satellite/weather as props; remove internal queries; new collapsible tabbed layout |
| `src/components/monitoring/EnvironmentalImpactCard.tsx` *(new)* | Corporate impact KPIs (CO₂, hectares, NDVI sparkline, days monitored) |
| `src/components/monitoring/NDVITimeSlider.tsx` *(new)* | Time slider + play button for satellite imagery |
| `src/components/monitoring/AgromonitoringIndicators.tsx` | Restyled KPI cards with trend + thresholds |
| `src/contexts/LanguageContext.tsx` | Add new ES/EN keys (impact card, time slider, layer toggle) |

### Out of scope (keep for later)
- Server-side aggregation/caching of Agromonitoring data via a scheduled job.
- PDF report export — only stub the button.
- Per-user OAuth for Agromonitoring (current shared admin key is fine).




## Plan: Three Fixes

### 1. Demo user balance showing zero

The `AuthContext.tsx` sets `account_balance: 500000` for the demo profile (line 194), while `DemoContext.tsx` sets `account_balance: 890000` (line 65). These are inconsistent but both non-zero. The issue is likely that the dashboard reads `profile?.account_balance` from `AuthContext`, and the value `500000` is correct but might be getting overwritten somewhere, or the balance display in `AppLayout.tsx` line 87 shows `$0` because the profile object is stale.

**Fix:** Synchronize demo balance in `AuthContext.tsx` to `890000` (matching DemoContext's total of investments: 250k + 400k + 240k). This ensures both contexts agree.

### 2. Map provider — replace Mapbox with a free alternative

The Mapbox map requires an API token fetched via edge function (`get-mapbox-token`). If the token is missing or the edge function auth fails (after security hardening), the map won't render.

**Fix:** Replace Mapbox GL JS with **Leaflet + OpenStreetMap** tiles in `PlotMap.tsx` and `MonitoringMap.tsx`. Leaflet is free, no API key needed, and supports satellite-like views via Esri World Imagery tiles (free for non-commercial/limited use) which look similar to Google Maps. Will use `leaflet` package with React.

Changes:
- Remove `mapbox-gl` dependency, add `leaflet` + `@types/leaflet`
- Rewrite `PlotMap.tsx` to use Leaflet with Esri satellite tiles + OpenStreetMap as base
- Keep polygon rendering (GeoJSON layers), corner markers, and heatmap layers (Leaflet heatmap plugin or simplified circle markers)
- Update `MonitoringMap.tsx` if it uses Mapbox
- Remove `get-mapbox-token` edge function dependency (optional, can keep for other uses)

### 3. Espadín maturation range: display as "5.5 a 6 años"

The DB stores `maturation_years` as a single numeric value (currently 5.5 for Espadín). The user wants it displayed as a **range** ("5.5 a 6 años") in all places where maturation is shown.

This is a **display-only** change — the underlying calculation still uses `maturation_years` (5.5) for progress calculations. We add display logic that shows "5.5 a 6" for Espadín wherever the maturation period is displayed.

**Files to update:**
- `src/pages/Dashboard.tsx` — line 416: `{maturationYears} años` → `{maturationYears} a {maturationYears + 0.5} años` (when species is Espadín)
- `src/components/simulator/InvestmentSimulator.tsx` — maturation time display (line 612)
- `src/pages/Investments.tsx` — no explicit maturation display but progress bar text could show range
- `src/contexts/DemoContext.tsx` — demo data `maturation_years` stays 5.5 (calculation value)
- `src/components/admin/SpeciesManager.tsx` — badge display line 397

**Approach:** Create a helper function `formatMaturationRange(years, speciesName)` that returns "5.5 a 6 años" for Espadín and `"{years} años"` for others. Use it in all display locations.

### Summary of changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Fix demo balance to 890000 |
| `src/components/PlotMap.tsx` | Replace Mapbox with Leaflet + Esri/OSM tiles |
| `src/components/monitoring/MonitoringMap.tsx` | Update if needed for Leaflet |
| `src/pages/Dashboard.tsx` | Show maturation as range for Espadín |
| `src/pages/Investments.tsx` | Show maturation as range for Espadín |
| `src/components/simulator/InvestmentSimulator.tsx` | Show maturation as range for Espadín |
| `src/components/admin/SpeciesManager.tsx` | Show maturation as range for Espadín |
| `src/lib/maturation.ts` (new) | Helper function for maturation range display |
| `package.json` | Add leaflet, remove mapbox-gl |


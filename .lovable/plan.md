

## Assessment Report: Gavé Agro Platform

### Status of All Sections

| Section | Status | Issues Found |
|---------|--------|-------------|
| Landing page (`/`) | Working | None |
| Auth (`/auth`) | Working | Minor: autocomplete attributes missing on password input |
| Dashboard (`/dashboard`) | Working | Espadín maturation shows "5.5 a 6 años" correctly; balance $890,000 correct |
| Investments (`/investments`) | Working | All 3 investments render with calculators; no errors |
| Plots (`/plots`) | Working | Leaflet maps with Esri satellite tiles render correctly for all plots |
| Simulator (`/simulator`) | Working | Maturation shows "5.5 a 6 años" correctly |
| Profile (`/profile`) | **Bug** | "Capital Total Invertido" shows $0 for demo user |
| Admin (`/admin`) | Working | Correctly denies access to demo user |
| Runtime errors | None | Clean console, no crashes |

---

### Bug: Profile Page — Demo User Shows $0 Invested

**Root cause:** `Profile.tsx` (line 31-46) queries Supabase `investments` table filtered by `user.id`. The demo user has a fake UUID that doesn't exist in the database, so it always returns $0. Unlike Dashboard and Investments pages, Profile doesn't check for demo mode.

**Fix:** Add demo mode check — if `isDemoMode`, calculate total from `demoData.investments` instead of querying Supabase.

---

### Optimization Opportunities

#### 1. Performance (FCP = 5.5s, Total load = 6.1s)
- **Lazy-load routes**: Admin.tsx (63KB), InvestmentSimulator.tsx (31KB), UserManager.tsx (28KB) are loaded eagerly even when not needed. Using `React.lazy()` with `Suspense` for these routes would cut initial bundle significantly.
- **Lazy-load Leaflet**: The leaflet.js (78KB) is loaded on every page even when no map is visible. Dynamically import it only in PlotMap.
- **Lazy-load Recharts**: recharts.js (219KB) is the largest dependency. Only import it in pages that use charts.
- **lucide-react** (157KB): Import only needed icons, not the entire library (this is likely already done but verify tree-shaking is working).

#### 2. MonitoringMap is a Placeholder
- `MonitoringMap.tsx` shows a static gradient with mock markers instead of a real map. It should use Leaflet (like PlotMap) to show actual plot locations on a real map.

#### 3. Code Quality
- **Duplicate demo data**: Demo user/profile is defined in both `AuthContext.tsx` and `DemoContext.tsx`. Single source of truth would prevent sync issues.
- **`any` types**: `userInvestments` and `allInvestments` in Investments.tsx use `any[]`. Proper typing would prevent runtime issues.
- **No error boundaries on routes**: Only a global ErrorBoundary exists. Route-level boundaries would prevent one page crash from blanking the whole app.

#### 4. Security (Already Addressed, Pending Manual)
- OTP expiry reduction (Supabase dashboard)
- Leaked password protection (Supabase dashboard)
- Postgres version upgrade (Supabase dashboard)

#### 5. UX Improvements
- **MonitoringMap**: Replace placeholder with real Leaflet map showing all plots
- **Profile page**: Add investment summary cards similar to dashboard
- **Mobile sidebar**: Verify collapse behavior on small screens
- **Loading states**: Some pages show "Cargando..." text instead of skeleton loaders

---

### Recommended Priority

1. **Fix Profile page demo bug** (quick fix, user-facing)
2. **Lazy-load routes** (biggest performance win)
3. **Replace MonitoringMap placeholder** with real Leaflet map
4. **Consolidate demo data** into single source of truth


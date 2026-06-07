# Project Memory — Bezza Earnings & Observability Engine

A working-state map of the codebase: the constants that drive every calculation,
the structural layout, and candidate directions for future work.

---

## 1. State variables / system constants

All tunables live in [`lib/constants.ts`](lib/constants.ts):

| Constant | Value | Used by |
| --- | --- | --- |
| `VEHICLE.baselineMileageKm` | 30,000 | milestone fallbacks, current odometer |
| `FUEL_EFFICIENCY_KM_PER_L` | 21.0 | shift fuel-litre estimate |
| `SUBSIDISED_FUEL_RATE` | 1.99 | within-quota fuel cost |
| `DEFAULT_FLOATING_FUEL_RATE` | 2.60 | over-quota fuel cost (overridable in Settings) |
| `SERVICE_SINKING_FUND_PER_KM` | 0.032 | per-shift service allocation |
| `APAD_QUOTA_TIERS` | 200 / 600 / 800 L | monthly quota from last month's km |
| `MILESTONES` | major service / battery / tyres | sinking-fund visualizer |

**Runtime / persisted state**
- Floating fuel rate is user-adjustable and stored in `localStorage` under
  `ehailing.settings.v1` via [`components/useSettings.ts`](components/useSettings.ts).
  (Chosen over a DB table to stay within the zero-cost footprint.)
- Auth session lives in Supabase cookies, refreshed by `middleware.ts`.

**Quota decision logic** (`lib/calculations.ts`)
1. `previousMonthDistanceKm` — sum of shift distances started last calendar month.
2. `currentMonthQuotaLiters` — maps that distance onto APAD tiers.
3. `currentMonthLitersPumped` — sum of `fuel_logs.liters_pumped` this month.
4. `effectiveFuelRate` — subsidised until used ≥ quota, then floating rate.

---

## 2. Structural state (file map)

```
app/
  layout.tsx                  Root layout, fonts, metadata
  globals.css                 Tailwind layers + component classes
  page.tsx                    Server Component: auth gate + data fetch
  actions.ts                  Server Actions (shifts/fuel/maintenance/auth)
  login/page.tsx              Google OAuth + magic-link sign-in
  auth/callback/route.ts      OAuth/magic-link code exchange
  api/cron/keep-alive/route.ts  Vercel Cron Supabase ping (SELECT 1 equivalent)

components/
  Dashboard.tsx               Client orchestrator: tabs + shared settings
  QuotaWidget.tsx             BUDI95 quota progress bar
  SinkingFund.tsx             3 milestone progress bars
  Analytics.tsx               Stat cards + Recharts heatmap
  ShiftLogger.tsx             Start/End shift forms + recent list
  FuelManager.tsx             Add/list/delete fuel logs
  MaintenanceManager.tsx      Add/list/delete maintenance logs
  Settings.tsx                Floating-rate editor + constant readout
  useSettings.ts              localStorage settings hook
  ui.tsx                      ProgressBar, StatCard, SectionTitle

lib/
  constants.ts                System constants (see section 1)
  types.ts                    Domain types mirroring schema
  calculations.ts             Pure costing/analytics/milestone engine
  supabase/{client,server,middleware}.ts  Supabase SSR clients

supabase/migrations/0001_init.sql   Schema + RLS
middleware.ts                Session refresh + route guard
vercel.json                  Cron registration
```

**Data flow:** `page.tsx` (server) fetches all rows → passes to `Dashboard`
(client) → pure functions in `calculations.ts` derive every metric. Mutations go
through Server Actions which `revalidatePath('/')`.

---

## 3. Potential feature paths

- **Server-side settings**: promote floating rate (and per-platform commission
  %) to a `user_settings` table so it syncs across devices.
- **Net earnings after platform commission**: store commission per platform and
  compute take-home vs. gross.
- **CSV / PDF export** for monthly tax/accounting summaries.
- **Trend charts**: weekly/monthly net profit line chart, km vs. earnings.
- **Predictive alerts**: notify when projected month-end litres will exceed the
  quota, or when a milestone is < 1,000 km away.
- **PWA / offline**: add a manifest + service worker so the shift logger works
  without signal; queue writes and sync on reconnect.
- **Multi-vehicle**: generalise constants into a vehicle profile record.
- **Fuel-efficiency calibration**: derive real km/L from consecutive fuel logs
  instead of the static 21.0 baseline.

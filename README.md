# 🚗 Bezza Earnings & Observability Engine

A secure, mobile-first e-hailing **earnings + vehicle observability** web app, calibrated for a **2025 Perodua Bezza X 1.3L** starting at a **30,000 km** baseline.

Built to run at **$0 forever** on the Vercel Hobby + Supabase Free tiers.

---

## ✨ Features

- **Mobile-frictionless shift logger** — one-tap start, auto-captured end time (with override), dynamic per-platform earnings (Grab / Bolt / inDrive + custom), and a cash vs. digital-wallet split.
- **Dynamic BUDI95 costing engine** — APAD tiered monthly quota derived from *last month's* distance; shifts cost fuel at **RM 1.99/L** while within quota and switch to the **floating market rate** once exceeded.
- **Quota widget** — live "Subsidised Fuel Used: X / [Dynamic Quota] L" progress bar.
- **Sinking-fund visualizer** — three progress bars (40k Major Service, M42 EFB Battery, 175/65 R14 Tyres) computed from the latest `replaced_at_odometer` vs. the current max odometer.
- **Advanced analytics** — Net Profit, Gross vs. Net hourly rate, and a Time-of-Day profit heatmap (morning / afternoon / night).
- **Supabase Auth** — Google OAuth **and** email magic link.
- **Row Level Security** — every row is private to its owner (`auth.uid() = user_id`).

---

## 🧮 System constants (Bezza 1.3L profile)

| Constant | Value |
| --- | --- |
| Fuel efficiency baseline | 21.0 km/L |
| Subsidised fuel (BUDI95) | RM 1.99 / L |
| Floating market rate (adjustable) | RM 2.60 / L |
| Service sinking fund | RM 0.032 / km |
| 40,000 km Major Service | RM 631 |
| M42 EFB Battery | 25,000 km · RM 320 |
| 175/65 R14 Tyres | 45,000 km · RM 650 |

### APAD BUDI95 monthly quota tiers (from previous month's distance)

| Previous month distance | Subsidised quota |
| --- | --- |
| < 2,000 km | 200 L |
| 2,000 – 4,999 km | 600 L |
| ≥ 5,000 km | 800 L |

---

## 🏗️ Tech stack

- **Next.js 14** (App Router, Server Actions)
- **Tailwind CSS**
- **Lucide React** (icons) · **Recharts** (charts)
- **Supabase** (Postgres + Auth + RLS)
- **Vercel** (hosting + Cron)

---

## 🚀 Zero-cost deployment checklist

### 1. Supabase
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the `shifts`, `fuel_logs`, and `maintenance_logs` tables with full RLS.
3. **Authentication → Providers**: enable **Email** (magic link) and/or **Google** OAuth.
4. **Authentication → URL Configuration**: set the Site URL to your Vercel domain and add `https://<your-domain>/auth/callback` to the **Redirect URLs**.

### 2. Environment variables
Already present in `.env.local` for local dev:

```
NEXT_PUBLIC_SUPABASE_URL=https://pgcvgmxsegothpaistjz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CRON_SECRET=            # optional, see Cron section
```

In **Vercel → Project → Settings → Environment Variables**, add the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `CRON_SECRET`).

### 3. Deploy
```bash
npm install
npm run build      # verify locally
```
Push to GitHub and import the repo in Vercel (Hobby tier). The framework preset is auto-detected as **Next.js**.

---

## ⏰ Cron keep-alive (prevents Supabase free-tier pause)

Supabase pauses a free project after **7 days** of inactivity. [`vercel.json`](vercel.json) registers a Vercel Cron job that pings the database every **5 days**:

```json
{ "crons": [{ "path": "/api/cron/keep-alive", "schedule": "0 0 */5 * *" }] }
```

The endpoint [`/api/cron/keep-alive`](app/api/cron/keep-alive/route.ts) runs a lightweight count-only query (equivalent to `SELECT 1`).

**Optional hardening:** set a `CRON_SECRET` env var in Vercel. Vercel Cron automatically sends it as `Authorization: Bearer <CRON_SECRET>`; the endpoint rejects any request without it.

> Vercel Hobby Cron runs once per day at the scheduled time — `0 0 */5 * *` fires on days 1, 6, 11, 16, 21, 26, comfortably inside the 7-day window.

---

## 🧑‍💻 Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## 🗄️ Database schema

| Table | Key columns |
| --- | --- |
| `shifts` | `shift_start/end`, `start/end_mileage`, `earnings` (JSONB), `expenses` (JSONB) |
| `fuel_logs` | `date`, `odometer`, `liters_pumped`, `total_cost` |
| `maintenance_logs` | `date`, `part_name`, `replaced_at_odometer`, `cost` |

All tables enforce `auth.uid() = user_id` for SELECT / INSERT / UPDATE / DELETE.

---

## 💰 Cost model

| Service | Tier | Cost |
| --- | --- | --- |
| Vercel | Hobby | $0 |
| Supabase | Free (500 MB) | $0 |
| **Total** | | **$0 / month** |

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { SectionTitle } from "./ui";
import {
  effectiveFuelRate,
  rm,
  shiftFinancials,
  shiftGrossEarnings,
} from "@/lib/calculations";
import type { FuelLog, Shift } from "@/lib/types";

const COLORS = {
  income: "#34d399", // green — money you keep
  fuel: "#fb923c", // orange — fuel cost
  service: "#a78bfa", // purple — car service savings
};

export default function Analytics({
  shifts,
  fuelLogs,
  floatingRate,
}: {
  shifts: Shift[];
  fuelLogs: FuelLog[];
  floatingRate: number;
}) {
  const rate = effectiveFuelRate(shifts, fuelLogs, floatingRate);

  // Closed shifts only, oldest → newest.
  const closed = shifts
    .filter((s) => s.shift_end && s.end_mileage != null)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime()
    );

  // Totals (Net Income excludes tolls/parking — we only count fuel + service).
  let gross = 0;
  let fuelCost = 0;
  let serviceCost = 0;
  let hours = 0;
  for (const s of closed) {
    const f = shiftFinancials(s, rate);
    gross += f.gross;
    fuelCost += f.fuelCost;
    serviceCost += f.serviceAllocation;
    hours += f.hours;
  }
  const runningCost = fuelCost + serviceCost;
  const netIncome = gross - runningCost;
  const netPerHour = hours > 0 ? netIncome / hours : 0;

  // Per-shift stacked chart data (last 14 shifts).
  const chartData = closed.slice(-14).map((s) => {
    const f = shiftFinancials(s, rate);
    return {
      name: new Date(s.shift_start).toLocaleDateString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "2-digit",
        month: "short",
      }),
      income: Number((shiftGrossEarnings(s) - f.fuelCost - f.serviceAllocation).toFixed(2)),
      fuel: Number(f.fuelCost.toFixed(2)),
      service: Number(f.serviceAllocation.toFixed(2)),
    };
  });

  return (
    <section className="space-y-4">
      {/* Main number: Net Income */}
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <span className="label">Net Income</span>
          <span className="shrink-0 text-emerald-400">
            <Wallet size={18} />
          </span>
        </div>
        <div className="text-3xl font-extrabold text-emerald-400 lg:text-4xl">
          {rm(netIncome)}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          What you keep after fuel &amp; car service · {closed.length} shifts
        </p>
      </div>

      {/* Net per hour + money spent */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card">
          <div className="flex items-start justify-between gap-2">
            <span className="label">Net / Hour</span>
            <span className="shrink-0 text-slate-500">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {rm(netPerHour)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Take-home per hour driven</p>
        </div>

        <div className="card">
          <span className="label">Fuel + Service</span>
          <div className="text-2xl font-bold text-red-400">
            &minus;{rm(runningCost)}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: COLORS.fuel }}
                />
                Fuel
              </span>
              <span className="font-semibold text-red-400">&minus;{rm(fuelCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: COLORS.service }}
                />
                Car service
              </span>
              <span className="font-semibold text-red-400">&minus;{rm(serviceCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-shift stacked chart */}
      <div className="card">
        <SectionTitle icon={<BarChart3 size={20} />}>Income per Shift</SectionTitle>
        <p className="mb-3 text-xs text-slate-400">
          Each bar is one shift: green is what you keep, orange is fuel, purple is
          car service. The full bar is your gross earnings.
        </p>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No finished shifts yet. End a shift to see your breakdown here.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickMargin={4} />
                <YAxis stroke="#64748b" fontSize={11} width={40} />
                <Tooltip
                  cursor={{ fill: "#1e293b55" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                  formatter={(value: number, name) => [rm(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Kept" stackId="a" fill={COLORS.income} />
                <Bar dataKey="fuel" name="Fuel" stackId="a" fill={COLORS.fuel} />
                <Bar
                  dataKey="service"
                  name="Car service"
                  stackId="a"
                  fill={COLORS.service}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

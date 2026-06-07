"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Wallet,
  PiggyBank,
  Activity,
} from "lucide-react";
import { SectionTitle, StatCard } from "./ui";
import {
  aggregateFinancials,
  effectiveFuelRate,
  rm,
  timeOfDayHeatmap,
} from "@/lib/calculations";
import type { FuelLog, Shift } from "@/lib/types";

const BLOCK_COLORS = ["#fbbf24", "#38bdf8", "#a78bfa"];

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
  const agg = aggregateFinancials(shifts, rate);
  const heatmap = timeOfDayHeatmap(shifts, rate).map((b) => ({
    name: b.label.split(" ")[0],
    rate: Number(b.netHourlyRate.toFixed(2)),
    shifts: b.shiftCount,
  }));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net Profit"
          value={rm(agg.net)}
          sub={`${agg.shiftCount} shifts · ${rm(agg.gross)} gross`}
          icon={<PiggyBank size={18} />}
        />
        <StatCard
          label="Net / Hour"
          value={rm(agg.netHourlyRate)}
          sub={`Gross ${rm(agg.grossHourlyRate)}/h`}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Fuel + Service"
          value={rm(agg.fuelCost + agg.serviceAllocation)}
          sub={`Fuel ${rm(agg.fuelCost)} · Svc ${rm(agg.serviceAllocation)}`}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Manual OPEX"
          value={rm(agg.manualOpex)}
          sub="Tolls + parking"
          icon={<Wallet size={18} />}
        />
      </div>

      <div className="card">
        <SectionTitle icon={<Clock size={20} />}>
          Time-of-Day Profit Heatmap
        </SectionTitle>
        <p className="mb-3 text-xs text-slate-400">
          Net RM / hour by the time block a shift started.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heatmap} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickMargin={4} />
              <YAxis stroke="#64748b" fontSize={11} width={36} />
              <Tooltip
                cursor={{ fill: "#1e293b55" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
                formatter={(value: number, _name, item) => [
                  `RM ${value.toFixed(2)}/h`,
                  `Net rate (${item?.payload?.shifts ?? 0} shifts)`,
                ]}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {heatmap.map((_, i) => (
                  <Cell key={i} fill={BLOCK_COLORS[i % BLOCK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

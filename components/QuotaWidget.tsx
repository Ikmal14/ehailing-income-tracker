"use client";

import { Fuel, AlertTriangle } from "lucide-react";
import { ProgressBar, SectionTitle } from "./ui";
import { km, liters, quotaStatus } from "@/lib/calculations";
import { SUBSIDISED_FUEL_RATE } from "@/lib/constants";
import type { FuelLog, Shift } from "@/lib/types";

export default function QuotaWidget({
  shifts,
  fuelLogs,
  floatingRate,
}: {
  shifts: Shift[];
  fuelLogs: FuelLog[];
  floatingRate: number;
}) {
  const q = quotaStatus(shifts, fuelLogs);
  const tone = q.exceeded ? "red" : q.usedRatio > 0.8 ? "amber" : "brand";
  const activeRate = q.exceeded ? floatingRate : SUBSIDISED_FUEL_RATE;

  return (
    <div className="card">
      <SectionTitle icon={<Fuel size={20} />}>BUDI95 Quota</SectionTitle>

      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm text-slate-300">Subsidised Fuel Used</span>
        <span className="text-sm font-semibold text-slate-100">
          {liters(q.usedLiters)} / {liters(q.quotaLiters)}
        </span>
      </div>

      <ProgressBar ratio={q.usedRatio} tone={tone} />

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <div className="min-w-0 break-words">
          Quota tier from last month:
          <span className="ml-1 font-semibold text-slate-200">
            {km(q.prevMonthDistanceKm)}
          </span>
        </div>
        <div className="min-w-0 break-words text-right">
          Remaining:
          <span className="ml-1 font-semibold text-slate-200">
            {liters(q.remainingLiters)}
          </span>
        </div>
      </div>

      <div
        className={`mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 break-words rounded-xl px-3 py-2 text-xs ${
          q.exceeded
            ? "bg-red-500/10 text-red-300"
            : "bg-brand/10 text-brand"
        }`}
      >
        {q.exceeded && <AlertTriangle size={14} />}
        Active shift fuel rate:&nbsp;
        <span className="font-bold">RM {activeRate.toFixed(2)}/L</span>
        {q.exceeded
          ? " (floating market — quota exceeded)"
          : " (subsidised BUDI95)"}
      </div>
    </div>
  );
}

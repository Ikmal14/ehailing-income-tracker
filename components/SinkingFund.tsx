"use client";

import { Wrench, BatteryCharging, CircleDot, Gauge, PiggyBank } from "lucide-react";
import { ProgressBar, SectionTitle } from "./ui";
import {
  allMilestoneProgress,
  km,
  rm,
  shiftServiceAllocation,
} from "@/lib/calculations";
import type { FuelLog, MaintenanceLog, Shift } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  major_service: <Wrench size={18} />,
  battery: <BatteryCharging size={18} />,
  tyres: <CircleDot size={18} />,
};

export default function SinkingFund({
  shifts,
  maintenanceLogs,
  fuelLogs,
  variant = "full",
}: {
  shifts: Shift[];
  maintenanceLogs: MaintenanceLog[];
  fuelLogs: FuelLog[];
  variant?: "full" | "summary";
}) {
  const progress = allMilestoneProgress(shifts, maintenanceLogs, fuelLogs);
  const odo = progress[0]?.currentOdometer ?? 0;

  if (variant === "summary") {
    // Money set aside so far across all finished shifts (RM 0.032 / km).
    const saved = shifts
      .filter((s) => s.shift_end && s.end_mileage != null)
      .reduce((sum, s) => sum + shiftServiceAllocation(s), 0);

    // The next thing the car will need (closest by distance).
    const next = progress
      .slice()
      .sort((a, b) => a.kmRemaining - b.kmRemaining)[0];
    const tone = next?.overdue ? "red" : next && next.ratio > 0.85 ? "amber" : "brand";

    return (
      <div className="card">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle icon={<PiggyBank size={20} />}>Car Service Fund</SectionTitle>
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
            Odometer: <span className="font-semibold text-slate-200">{km(odo)}</span>
          </span>
        </div>

        <div className="mb-3">
          <div className="text-2xl font-bold text-brand">{rm(saved)}</div>
          <p className="text-xs text-slate-400">Saved so far for car upkeep</p>
        </div>

        {next && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words text-slate-200">
                Next: {next.milestone.label}
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-300">
                {rm(next.milestone.cost)}
              </span>
            </div>
            <ProgressBar ratio={next.ratio} tone={tone} />
            <div className="mt-1 text-xs text-slate-400">
              {next.overdue
                ? "Due now"
                : `${km(next.kmRemaining)} to go (due at ${km(next.dueOdometer)})`}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={<Gauge size={20} />}>Car Service Fund</SectionTitle>
        <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
          Odometer: <span className="font-semibold text-slate-200">{km(odo)}</span>
        </span>
      </div>

      <div className="space-y-4">
        {progress.map((p) => {
          const tone = p.overdue
            ? "red"
            : p.ratio > 0.85
              ? "amber"
              : "brand";
          return (
            <div key={p.milestone.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-200">
                  <span className="shrink-0 text-brand">{ICONS[p.milestone.key]}</span>
                  <span className="min-w-0 break-words">{p.milestone.label}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-300">
                  {rm(p.milestone.cost)}
                </span>
              </div>
              <ProgressBar ratio={p.ratio} tone={tone} />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>
                  {p.overdue ? "Due now" : `${km(p.kmRemaining)} to go`}
                </span>
                <span>due at {km(p.dueOdometer)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

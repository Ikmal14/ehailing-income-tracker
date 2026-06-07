"use client";

import { Wrench, BatteryCharging, CircleDot, Gauge } from "lucide-react";
import { ProgressBar, SectionTitle } from "./ui";
import { allMilestoneProgress, km, rm } from "@/lib/calculations";
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
}: {
  shifts: Shift[];
  maintenanceLogs: MaintenanceLog[];
  fuelLogs: FuelLog[];
}) {
  const progress = allMilestoneProgress(shifts, maintenanceLogs, fuelLogs);
  const odo = progress[0]?.currentOdometer ?? 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={<Gauge size={20} />}>Sinking Fund</SectionTitle>
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
                  {p.overdue
                    ? "Overdue"
                    : `${km(p.kmRemaining)} remaining`}
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

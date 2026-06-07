"use client";

import { SlidersHorizontal } from "lucide-react";
import { SectionTitle } from "./ui";
import {
  FUEL_EFFICIENCY_KM_PER_L,
  SERVICE_SINKING_FUND_PER_KM,
  SUBSIDISED_FUEL_RATE,
  VEHICLE,
} from "@/lib/constants";

export default function Settings({
  floatingRate,
  onChange,
}: {
  floatingRate: number;
  onChange: (rate: number) => void;
}) {
  return (
    <div className="card">
      <SectionTitle icon={<SlidersHorizontal size={20} />}>Settings</SectionTitle>

      <div className="mb-4">
        <label className="label" htmlFor="floating_rate">
          Floating market fuel rate (RM / L)
        </label>
        <input
          id="floating_rate"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={floatingRate}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-400">
          Applied automatically once the monthly BUDI95 quota is exceeded.
          Saved on this device.
        </p>
      </div>

      <dl className="space-y-2 text-sm">
        <Row label="Vehicle" value={VEHICLE.name} />
        <Row label="Baseline mileage" value={`${VEHICLE.baselineMileageKm.toLocaleString()} km`} />
        <Row label="Fuel efficiency" value={`${FUEL_EFFICIENCY_KM_PER_L.toFixed(1)} km/L`} />
        <Row label="Subsidised rate" value={`RM ${SUBSIDISED_FUEL_RATE.toFixed(2)}/L`} />
        <Row label="Service sinking fund" value={`RM ${SERVICE_SINKING_FUND_PER_KM.toFixed(3)}/km`} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-base-700 pb-2">
      <dt className="min-w-0 break-words text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-200">{value}</dd>
    </div>
  );
}

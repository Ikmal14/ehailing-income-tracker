"use client";

import { useState } from "react";
import {
  Play,
  Square,
  Trash2,
  Timer,
  Plus,
  ChevronDown,
} from "lucide-react";
import { SectionTitle } from "./ui";
import { startShift, endShift, deleteShift } from "@/app/actions";
import {
  effectiveFuelRate,
  km,
  rm,
  shiftFinancials,
  shiftGrossEarnings,
} from "@/lib/calculations";
import { PLATFORMS } from "@/lib/constants";
import { mytNowDatetimeLocal } from "@/lib/time";
import type { FuelLog, Shift } from "@/lib/types";

export default function ShiftLogger({
  shifts,
  fuelLogs,
  floatingRate,
}: {
  shifts: Shift[];
  fuelLogs: FuelLog[];
  floatingRate: number;
}) {
  const openShift = shifts.find((s) => !s.shift_end);
  const recent = shifts.filter((s) => s.shift_end).slice(0, 10);
  const rate = effectiveFuelRate(shifts, fuelLogs, floatingRate);

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionTitle icon={<Timer size={20} />}>Shift Logger</SectionTitle>
        {openShift ? <EndShiftForm shift={openShift} /> : <StartShiftForm />}
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h3 className="label">Recent shifts</h3>
          <p className="mb-2 text-xs text-slate-500">Tap a shift to see the full breakdown.</p>
          <ul className="divide-y divide-base-700">
            {recent.map((s) => (
              <RecentShiftItem key={s.id} shift={s} rate={rate} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecentShiftItem({ shift, rate }: { shift: Shift; rate: number }) {
  const [open, setOpen] = useState(false);
  const f = shiftFinancials(shift, rate);
  const kept = f.gross - f.fuelCost - f.serviceAllocation;
  const platforms = Object.entries(shift.earnings?.platforms ?? {});
  const cw = shift.earnings?.cash_vs_wallet ?? { cash: 0, wallet: 0 };
  const startD = new Date(shift.shift_start);
  const endD = shift.shift_end ? new Date(shift.shift_end) : null;
  const dateFmt: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
  };
  const timeFmt: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  };

  return (
    <li className="py-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 text-left"
        >
          <div className="min-w-0">
            <div className="truncate text-sm text-slate-200">
              {startD.toLocaleDateString("en-MY", dateFmt)} ·{" "}
              {km(f.distanceKm)} · {f.hours.toFixed(1)}h
            </div>
            <div className="text-xs text-slate-400">
              {rm(kept)} kept · {rm(f.gross)} gross
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <form action={deleteShift} className="shrink-0">
          <input type="hidden" name="shift_id" value={shift.id} />
          <button
            className="-mr-1 rounded-lg p-2 text-slate-500 hover:text-red-400"
            aria-label="Delete shift"
          >
            <Trash2 size={16} />
          </button>
        </form>
      </div>

      {open && (
        <div className="mb-2 space-y-3 rounded-xl bg-base-900/60 p-3 text-sm">
          <div className="text-xs text-slate-400">
            {startD.toLocaleTimeString("en-MY", timeFmt)}
            {endD ? ` → ${endD.toLocaleTimeString("en-MY", timeFmt)}` : ""} ·{" "}
            {km(shift.start_mileage)} → {km(shift.end_mileage ?? shift.start_mileage)}
          </div>

          {platforms.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Earnings
              </div>
              <div className="space-y-1">
                {platforms.map(([name, amt]) => (
                  <Row key={name} label={name} value={rm(Number(amt) || 0)} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Row label="Gross" value={rm(f.gross)} strong />
            <Row label="Fuel" value={`−${rm(f.fuelCost)}`} tone="red" />
            <Row label="Car service" value={`−${rm(f.serviceAllocation)}`} tone="red" />
            <div className="border-t border-base-700 pt-1">
              <Row label="Net kept" value={rm(kept)} tone="green" strong />
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Cash {rm(Number(cw.cash) || 0)} · Wallet {rm(Number(cw.wallet) || 0)} ·
            Tolls {rm(Number(shift.expenses?.tolls) || 0)} · Parking{" "}
            {rm(Number(shift.expenses?.parking) || 0)}
          </div>
        </div>
      )}
    </li>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
  strong?: boolean;
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
        ? "text-emerald-400"
        : "text-slate-200";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`${color} ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function StartShiftForm() {
  return (
    <form action={startShift} className="space-y-3">
      <div>
        <label className="label" htmlFor="start_mileage">
          Start mileage (km)
        </label>
        <input
          id="start_mileage"
          name="start_mileage"
          type="number"
          step="any"
          inputMode="decimal"
          required
          placeholder="e.g. 31250"
          className="input"
        />
      </div>
      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer select-none">
          Override start time
        </summary>
        <input
          name="shift_start"
          type="datetime-local"
          defaultValue={mytNowDatetimeLocal()}
          className="input mt-2"
        />
      </details>
      <button type="submit" className="btn-primary w-full">
        <Play size={18} />
        Start Shift
      </button>
    </form>
  );
}

function EndShiftForm({ shift }: { shift: Shift }) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <form action={endShift} className="space-y-4">
      <input type="hidden" name="shift_id" value={shift.id} />

      <div className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">
        Active shift started{" "}
        {new Date(shift.shift_start).toLocaleString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        @ {km(shift.start_mileage)}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="label" htmlFor="end_mileage">
            End mileage (km)
          </label>
          <input
            id="end_mileage"
            name="end_mileage"
            type="number"
            step="any"
            inputMode="decimal"
            required
            className="input"
          />
        </div>
        <div className="min-w-0">
          <label className="label" htmlFor="shift_end">
            End time
          </label>
          <input
            id="shift_end"
            name="shift_end"
            type="datetime-local"
            defaultValue={mytNowDatetimeLocal()}
            className="input block"
          />
        </div>
      </div>

      <div>
        <h3 className="label">Earnings by platform (RM)</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => (
            <div key={p}>
              <label className="mb-1 block text-xs text-slate-400" htmlFor={`platform_${p}`}>
                {p}
              </label>
              <input
                id={`platform_${p}`}
                name={`platform_${p}`}
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                className="input"
              />
            </div>
          ))}
        </div>
        {showCustom ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              name="platform_custom_name"
              placeholder="Platform name"
              className="input"
            />
            <input
              name="platform_custom_amount"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="Amount"
              className="input"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Plus size={14} /> Add another platform
          </button>
        )}
      </div>

      <div>
        <h3 className="label">Cash vs digital wallet (RM)</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="cash">
              Cash
            </label>
            <input id="cash" name="cash" type="number" step="any" inputMode="decimal" placeholder="0" className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="wallet">
              Wallet
            </label>
            <input id="wallet" name="wallet" type="number" step="any" inputMode="decimal" placeholder="0" className="input" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="label">Expenses (RM)</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="tolls">
              Tolls
            </label>
            <input id="tolls" name="tolls" type="number" step="any" inputMode="decimal" placeholder="0" className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="parking">
              Parking
            </label>
            <input id="parking" name="parking" type="number" step="any" inputMode="decimal" placeholder="0" className="input" />
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full">
        <Square size={18} />
        End Shift &amp; Save
      </button>
    </form>
  );
}

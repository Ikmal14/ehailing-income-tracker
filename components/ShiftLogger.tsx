"use client";

import { useState } from "react";
import { Play, Square, Trash2, Timer, Plus } from "lucide-react";
import { SectionTitle } from "./ui";
import { startShift, endShift, deleteShift } from "@/app/actions";
import { km, rm, shiftGrossEarnings } from "@/lib/calculations";
import { PLATFORMS } from "@/lib/constants";
import type { Shift } from "@/lib/types";

/** Format a Date as a value usable by <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ShiftLogger({ shifts }: { shifts: Shift[] }) {
  const openShift = shifts.find((s) => !s.shift_end);
  const recent = shifts.filter((s) => s.shift_end).slice(0, 5);

  return (
    <div className="card">
      <SectionTitle icon={<Timer size={20} />}>Shift Logger</SectionTitle>

      {openShift ? (
        <EndShiftForm shift={openShift} />
      ) : (
        <StartShiftForm />
      )}

      {recent.length > 0 && (
        <div className="mt-5">
          <h3 className="label">Recent shifts</h3>
          <ul className="divide-y divide-base-700">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <div className="text-slate-200">
                    {new Date(s.shift_start).toLocaleDateString("en-MY", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    · {km((s.end_mileage ?? 0) - s.start_mileage)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {rm(shiftGrossEarnings(s))} gross
                  </div>
                </div>
                <form action={deleteShift}>
                  <input type="hidden" name="shift_id" value={s.id} />
                  <button className="text-slate-500 hover:text-red-400" aria-label="Delete shift">
                    <Trash2 size={16} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          defaultValue={toLocalInput(new Date())}
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
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        @ {km(shift.start_mileage)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
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
        <div>
          <label className="label" htmlFor="shift_end">
            End time
          </label>
          <input
            id="shift_end"
            name="shift_end"
            type="datetime-local"
            defaultValue={toLocalInput(new Date())}
            className="input"
          />
        </div>
      </div>

      <div>
        <h3 className="label">Earnings by platform (RM)</h3>
        <div className="grid grid-cols-3 gap-2">
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

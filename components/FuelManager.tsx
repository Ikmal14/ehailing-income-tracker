"use client";

import { Fuel, Trash2 } from "lucide-react";
import { SectionTitle } from "./ui";
import { addFuelLog, deleteFuelLog } from "@/app/actions";
import { km, liters, rm } from "@/lib/calculations";
import type { FuelLog } from "@/lib/types";

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function FuelManager({ fuelLogs }: { fuelLogs: FuelLog[] }) {
  const recent = fuelLogs.slice(0, 6);

  return (
    <div className="card">
      <SectionTitle icon={<Fuel size={20} />}>Fuel Logs</SectionTitle>

      <form action={addFuelLog} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="fuel_date">
              Date
            </label>
            <input
              id="fuel_date"
              name="date"
              type="date"
              defaultValue={todayInput()}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="odometer">
              Odometer (km)
            </label>
            <input id="odometer" name="odometer" type="number" step="any" inputMode="decimal" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="liters_pumped">
              Litres pumped
            </label>
            <input id="liters_pumped" name="liters_pumped" type="number" step="any" inputMode="decimal" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="total_cost">
              Total cost (RM)
            </label>
            <input id="total_cost" name="total_cost" type="number" step="any" inputMode="decimal" required className="input" />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">
          Add Fuel Log
        </button>
      </form>

      {recent.length > 0 && (
        <ul className="mt-4 divide-y divide-base-700">
          {recent.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="text-slate-200">
                  {liters(f.liters_pumped)} · {rm(f.total_cost)}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(f.date).toLocaleDateString("en-MY", {
                    day: "2-digit",
                    month: "short",
                  })}{" "}
                  @ {km(f.odometer)}
                </div>
              </div>
              <form action={deleteFuelLog}>
                <input type="hidden" name="id" value={f.id} />
                <button className="text-slate-500 hover:text-red-400" aria-label="Delete fuel log">
                  <Trash2 size={16} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

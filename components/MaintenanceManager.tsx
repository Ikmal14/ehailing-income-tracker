"use client";

import { Wrench, Trash2 } from "lucide-react";
import { SectionTitle } from "./ui";
import { addMaintenanceLog, deleteMaintenanceLog } from "@/app/actions";
import { km, rm } from "@/lib/calculations";
import { MILESTONES } from "@/lib/constants";
import type { MaintenanceLog } from "@/lib/types";

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MaintenanceManager({
  maintenanceLogs,
}: {
  maintenanceLogs: MaintenanceLog[];
}) {
  const recent = maintenanceLogs.slice(0, 6);

  return (
    <div className="card">
      <SectionTitle icon={<Wrench size={20} />}>Maintenance Logs</SectionTitle>

      <form action={addMaintenanceLog} className="space-y-3">
        <div>
          <label className="label" htmlFor="part_name">
            Part / service
          </label>
          <input
            id="part_name"
            name="part_name"
            list="part-options"
            required
            placeholder="e.g. Battery"
            className="input"
          />
          <datalist id="part-options">
            {MILESTONES.map((m) => (
              <option key={m.key} value={m.partName} />
            ))}
            <option value="Engine Oil" />
            <option value="Brake Pads" />
          </datalist>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="maint_date">
              Date
            </label>
            <input
              id="maint_date"
              name="date"
              type="date"
              defaultValue={todayInput()}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="replaced_at_odometer">
              Odometer
            </label>
            <input id="replaced_at_odometer" name="replaced_at_odometer" type="number" step="any" inputMode="decimal" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cost">
              Cost (RM)
            </label>
            <input id="cost" name="cost" type="number" step="any" inputMode="decimal" required className="input" />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">
          Add Maintenance Log
        </button>
      </form>

      {recent.length > 0 && (
        <ul className="mt-4 divide-y divide-base-700">
          {recent.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="text-slate-200">
                  {m.part_name} · {rm(m.cost)}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(m.date).toLocaleDateString("en-MY", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  @ {km(m.replaced_at_odometer)}
                </div>
              </div>
              <form action={deleteMaintenanceLog}>
                <input type="hidden" name="id" value={m.id} />
                <button className="text-slate-500 hover:text-red-400" aria-label="Delete maintenance log">
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

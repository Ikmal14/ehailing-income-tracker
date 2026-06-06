"use client";

import { useState } from "react";
import {
  Car,
  LayoutDashboard,
  Timer,
  Fuel,
  Wrench,
  LogOut,
} from "lucide-react";
import { useSettings } from "./useSettings";
import { signOut } from "@/app/actions";
import QuotaWidget from "./QuotaWidget";
import SinkingFund from "./SinkingFund";
import Analytics from "./Analytics";
import ShiftLogger from "./ShiftLogger";
import FuelManager from "./FuelManager";
import MaintenanceManager from "./MaintenanceManager";
import Settings from "./Settings";
import type { FuelLog, MaintenanceLog, Shift } from "@/lib/types";

type Tab = "overview" | "shift" | "fuel" | "service";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { key: "shift", label: "Shift", icon: <Timer size={18} /> },
  { key: "fuel", label: "Fuel", icon: <Fuel size={18} /> },
  { key: "service", label: "Service", icon: <Wrench size={18} /> },
];

export default function Dashboard({
  userEmail,
  shifts,
  fuelLogs,
  maintenanceLogs,
}: {
  userEmail: string;
  shifts: Shift[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const { settings, update } = useSettings();
  const rate = settings.floatingFuelRate;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:pb-10">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Car size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-100">
              Bezza Observability
            </h1>
            <p className="text-xs text-slate-400">{userEmail}</p>
          </div>
        </div>
        <form action={signOut}>
          <button className="btn-ghost px-3 py-2" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </form>
      </header>

      {/* Desktop tab bar */}
      <nav className="mb-5 hidden gap-2 lg:flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${
              tab === t.key ? "btn-primary" : "btn-ghost"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <QuotaWidget shifts={shifts} fuelLogs={fuelLogs} floatingRate={rate} />
            <SinkingFund
              shifts={shifts}
              maintenanceLogs={maintenanceLogs}
              fuelLogs={fuelLogs}
            />
          </div>
          <Analytics shifts={shifts} fuelLogs={fuelLogs} floatingRate={rate} />
          <Settings
            floatingRate={rate}
            onChange={(r) => update({ floatingFuelRate: r })}
          />
        </div>
      )}

      {tab === "shift" && <ShiftLogger shifts={shifts} />}

      {tab === "fuel" && (
        <div className="space-y-4">
          <QuotaWidget shifts={shifts} fuelLogs={fuelLogs} floatingRate={rate} />
          <FuelManager fuelLogs={fuelLogs} />
        </div>
      )}

      {tab === "service" && (
        <div className="space-y-4">
          <SinkingFund
            shifts={shifts}
            maintenanceLogs={maintenanceLogs}
            fuelLogs={fuelLogs}
          />
          <MaintenanceManager maintenanceLogs={maintenanceLogs} />
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-base-700 bg-base-900/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
                tab === t.key ? "text-brand" : "text-slate-400"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

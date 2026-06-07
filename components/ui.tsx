"use client";

import { ReactNode } from "react";

export function ProgressBar({
  ratio,
  tone = "brand",
}: {
  ratio: number;
  tone?: "brand" | "amber" | "red";
}) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const color =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-400"
        : "bg-brand";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-700">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-1">
        <span className="label min-w-0">{label}</span>
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
      </div>
      <div className="break-words text-xl font-bold text-slate-100 lg:text-2xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-100">
      {icon && <span className="text-brand">{icon}</span>}
      {children}
    </h2>
  );
}

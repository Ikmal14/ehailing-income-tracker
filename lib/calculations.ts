/**
 * Pure calculation engine for the e-hailing observability app.
 *
 * Every function here is deterministic and side-effect free so it can be reused
 * on both the server and the client, and unit-tested in isolation.
 */

import {
  APAD_QUOTA_TIERS,
  FUEL_EFFICIENCY_KM_PER_L,
  MILESTONES,
  Milestone,
  SERVICE_SINKING_FUND_PER_KM,
  SUBSIDISED_FUEL_RATE,
  VEHICLE,
} from "./constants";
import type { FuelLog, MaintenanceLog, Shift } from "./types";

/* ------------------------------------------------------------------ */
/* Date helpers (operate on Malaysia-time calendar months)             */
/* ------------------------------------------------------------------ */

/** Malaysia is a fixed UTC+8 offset (no daylight saving). */
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Returns [start, end) boundaries of the calendar month containing `ref`. */
export function monthBounds(ref: Date): { start: Date; end: Date } {
  const m = new Date(ref.getTime() + MYT_OFFSET_MS);
  const y = m.getUTCFullYear();
  const mo = m.getUTCMonth();
  const start = new Date(Date.UTC(y, mo, 1) - MYT_OFFSET_MS);
  const end = new Date(Date.UTC(y, mo + 1, 1) - MYT_OFFSET_MS);
  return { start, end };
}

/** Returns [start, end) boundaries of the calendar month before `ref`. */
export function previousMonthBounds(ref: Date): { start: Date; end: Date } {
  const m = new Date(ref.getTime() + MYT_OFFSET_MS);
  const y = m.getUTCFullYear();
  const mo = m.getUTCMonth();
  const start = new Date(Date.UTC(y, mo - 1, 1) - MYT_OFFSET_MS);
  const end = new Date(Date.UTC(y, mo, 1) - MYT_OFFSET_MS);
  return { start, end };
}

function within(dateIso: string, start: Date, end: Date): boolean {
  const t = new Date(dateIso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

/* ------------------------------------------------------------------ */
/* Shift-level primitives                                              */
/* ------------------------------------------------------------------ */

/** Sum of all per-platform gross earnings for a single shift. */
export function shiftGrossEarnings(shift: Shift): number {
  if (!shift.earnings) return 0;
  return Object.values(shift.earnings.platforms ?? {}).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
}

/** Manual operating expenses (tolls + parking) for a single shift. */
export function shiftManualOpex(shift: Shift): number {
  if (!shift.expenses) return 0;
  return (Number(shift.expenses.tolls) || 0) + (Number(shift.expenses.parking) || 0);
}

/** Distance driven in a single shift (km). Returns 0 if the shift is open. */
export function shiftDistanceKm(shift: Shift): number {
  if (shift.end_mileage == null || shift.start_mileage == null) return 0;
  const d = Number(shift.end_mileage) - Number(shift.start_mileage);
  return d > 0 ? d : 0;
}

/** Duration of a shift in hours. Returns 0 if the shift is open. */
export function shiftHours(shift: Shift): number {
  if (!shift.shift_end) return 0;
  const ms = new Date(shift.shift_end).getTime() - new Date(shift.shift_start).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

/* ------------------------------------------------------------------ */
/* APAD BUDI95 tiered quota engine                                     */
/* ------------------------------------------------------------------ */

/** Total distance (km) driven across shifts that started in the previous month. */
export function previousMonthDistanceKm(shifts: Shift[], ref: Date): number {
  const { start, end } = previousMonthBounds(ref);
  return shifts
    .filter((s) => within(s.shift_start, start, end))
    .reduce((sum, s) => sum + shiftDistanceKm(s), 0);
}

/**
 * Resolve the current month's subsidised litre quota from APAD tiers, based on
 * the *previous* calendar month's total distance.
 */
export function currentMonthQuotaLiters(prevMonthDistanceKm: number): number {
  for (const tier of APAD_QUOTA_TIERS) {
    if (prevMonthDistanceKm < tier.maxDistanceKm) return tier.quotaLiters;
  }
  // Unreachable because the last tier uses Infinity, but keep a safe default.
  return APAD_QUOTA_TIERS[APAD_QUOTA_TIERS.length - 1].quotaLiters;
}

/** Total litres pumped in the calendar month containing `ref`. */
export function currentMonthLitersPumped(fuelLogs: FuelLog[], ref: Date): number {
  const { start, end } = monthBounds(ref);
  return fuelLogs
    .filter((f) => within(f.date, start, end))
    .reduce((sum, f) => sum + (Number(f.liters_pumped) || 0), 0);
}

export interface QuotaStatus {
  quotaLiters: number;
  usedLiters: number;
  remainingLiters: number;
  usedRatio: number;
  /** True when usage has met or exceeded the subsidised quota. */
  exceeded: boolean;
  prevMonthDistanceKm: number;
}

/** Full BUDI95 quota status for the dashboard widget. */
export function quotaStatus(
  shifts: Shift[],
  fuelLogs: FuelLog[],
  ref: Date = new Date()
): QuotaStatus {
  const prevMonthDistanceKm = previousMonthDistanceKm(shifts, ref);
  const quotaLiters = currentMonthQuotaLiters(prevMonthDistanceKm);
  const usedLiters = currentMonthLitersPumped(fuelLogs, ref);
  const remainingLiters = Math.max(0, quotaLiters - usedLiters);
  const usedRatio = quotaLiters > 0 ? usedLiters / quotaLiters : 0;
  return {
    quotaLiters,
    usedLiters,
    remainingLiters,
    usedRatio,
    exceeded: usedLiters >= quotaLiters,
    prevMonthDistanceKm,
  };
}

/**
 * Effective fuel rate (RM / L) that applies to *new* fuel consumption right now:
 * subsidised while within quota, floating market rate once exceeded.
 */
export function effectiveFuelRate(
  shifts: Shift[],
  fuelLogs: FuelLog[],
  floatingRate: number,
  ref: Date = new Date()
): number {
  return quotaStatus(shifts, fuelLogs, ref).exceeded
    ? floatingRate
    : SUBSIDISED_FUEL_RATE;
}

/* ------------------------------------------------------------------ */
/* Costing                                                            */
/* ------------------------------------------------------------------ */

/** Litres of fuel a shift's distance is estimated to consume. */
export function shiftFuelLiters(shift: Shift): number {
  return shiftDistanceKm(shift) / FUEL_EFFICIENCY_KM_PER_L;
}

/** Estimated fuel cost of a shift at a given effective rate (RM). */
export function shiftFuelCost(shift: Shift, ratePerL: number): number {
  return shiftFuelLiters(shift) * ratePerL;
}

/** Service sinking-fund allocation accrued by a shift (RM). */
export function shiftServiceAllocation(shift: Shift): number {
  return shiftDistanceKm(shift) * SERVICE_SINKING_FUND_PER_KM;
}

export interface ShiftFinancials {
  gross: number;
  fuelCost: number;
  serviceAllocation: number;
  manualOpex: number;
  net: number;
  distanceKm: number;
  hours: number;
}

/**
 * Net Profit = Gross Earnings - Tiered Fuel Cost - Service Allocation - Manual OPEX.
 * `ratePerL` should be the effective tiered rate at the time of evaluation.
 */
export function shiftFinancials(shift: Shift, ratePerL: number): ShiftFinancials {
  const gross = shiftGrossEarnings(shift);
  const fuelCost = shiftFuelCost(shift, ratePerL);
  const serviceAllocation = shiftServiceAllocation(shift);
  const manualOpex = shiftManualOpex(shift);
  return {
    gross,
    fuelCost,
    serviceAllocation,
    manualOpex,
    net: gross - fuelCost - serviceAllocation - manualOpex,
    distanceKm: shiftDistanceKm(shift),
    hours: shiftHours(shift),
  };
}

/* ------------------------------------------------------------------ */
/* Aggregate analytics                                                */
/* ------------------------------------------------------------------ */

export interface AggregateFinancials {
  gross: number;
  fuelCost: number;
  serviceAllocation: number;
  manualOpex: number;
  net: number;
  distanceKm: number;
  hours: number;
  grossHourlyRate: number;
  netHourlyRate: number;
  shiftCount: number;
}

export function aggregateFinancials(
  shifts: Shift[],
  ratePerL: number
): AggregateFinancials {
  const closed = shifts.filter((s) => s.shift_end && s.end_mileage != null);
  const totals = closed.reduce(
    (acc, s) => {
      const f = shiftFinancials(s, ratePerL);
      acc.gross += f.gross;
      acc.fuelCost += f.fuelCost;
      acc.serviceAllocation += f.serviceAllocation;
      acc.manualOpex += f.manualOpex;
      acc.net += f.net;
      acc.distanceKm += f.distanceKm;
      acc.hours += f.hours;
      return acc;
    },
    {
      gross: 0,
      fuelCost: 0,
      serviceAllocation: 0,
      manualOpex: 0,
      net: 0,
      distanceKm: 0,
      hours: 0,
    }
  );

  return {
    ...totals,
    grossHourlyRate: totals.hours > 0 ? totals.gross / totals.hours : 0,
    netHourlyRate: totals.hours > 0 ? totals.net / totals.hours : 0,
    shiftCount: closed.length,
  };
}

/* ------------------------------------------------------------------ */
/* Milestone / sinking-fund progress                                 */
/* ------------------------------------------------------------------ */

/** Highest odometer reading seen across all shift end mileages. */
export function currentOdometer(shifts: Shift[], fuelLogs: FuelLog[] = []): number {
  const shiftMax = shifts.reduce<number>((max, s) => {
    const m = Number(s.end_mileage ?? s.start_mileage ?? 0);
    return m > max ? m : max;
  }, VEHICLE.baselineMileageKm);
  const fuelMax = fuelLogs.reduce<number>(
    (max, f) => (Number(f.odometer) > max ? Number(f.odometer) : max),
    0
  );
  return Math.max(shiftMax, fuelMax);
}

export interface MilestoneProgress {
  milestone: Milestone;
  /** Odometer at which the part was last replaced (or baseline if never). */
  lastReplacedOdometer: number;
  /** Odometer at which the next replacement / service is due. */
  dueOdometer: number;
  currentOdometer: number;
  /** Distance already accrued toward the milestone (km). */
  kmUsed: number;
  /** Distance remaining until due (km, clamped at 0). */
  kmRemaining: number;
  /** Progress fraction in [0, 1]. */
  ratio: number;
  overdue: boolean;
}

function latestReplacement(
  logs: MaintenanceLog[],
  partName: string
): MaintenanceLog | null {
  const matches = logs
    .filter((l) => l.part_name === partName)
    .sort(
      (a, b) =>
        Number(b.replaced_at_odometer) - Number(a.replaced_at_odometer)
    );
  return matches[0] ?? null;
}

export function milestoneProgress(
  milestone: Milestone,
  shifts: Shift[],
  maintenanceLogs: MaintenanceLog[],
  fuelLogs: FuelLog[] = []
): MilestoneProgress {
  const odo = currentOdometer(shifts, fuelLogs);
  const last = latestReplacement(maintenanceLogs, milestone.partName);

  let lastReplacedOdometer: number;
  let dueOdometer: number;

  if (milestone.intervalKm != null) {
    // Interval-based part (battery, tyres).
    lastReplacedOdometer = last
      ? Number(last.replaced_at_odometer)
      : VEHICLE.baselineMileageKm;
    dueOdometer = lastReplacedOdometer + milestone.intervalKm;
  } else {
    // Fixed-target milestone (40k major service).
    lastReplacedOdometer = last
      ? Number(last.replaced_at_odometer)
      : VEHICLE.baselineMileageKm;
    dueOdometer = last
      ? lastReplacedOdometer + 40_000 // subsequent majors recur every 40k
      : (milestone.targetOdometer as number);
  }

  const span = Math.max(1, dueOdometer - lastReplacedOdometer);
  const kmUsed = Math.max(0, odo - lastReplacedOdometer);
  const kmRemaining = Math.max(0, dueOdometer - odo);
  const ratio = Math.min(1, Math.max(0, kmUsed / span));

  return {
    milestone,
    lastReplacedOdometer,
    dueOdometer,
    currentOdometer: odo,
    kmUsed,
    kmRemaining,
    ratio,
    overdue: odo >= dueOdometer,
  };
}

export function allMilestoneProgress(
  shifts: Shift[],
  maintenanceLogs: MaintenanceLog[],
  fuelLogs: FuelLog[] = []
): MilestoneProgress[] {
  return MILESTONES.map((m) =>
    milestoneProgress(m, shifts, maintenanceLogs, fuelLogs)
  );
}

/* ------------------------------------------------------------------ */
/* Time-of-day profit heatmap                                         */
/* ------------------------------------------------------------------ */

export type TimeBlockKey = "morning" | "afternoon" | "night";

export interface TimeBlockStat {
  key: TimeBlockKey;
  label: string;
  hours: number;
  net: number;
  /** Net RM / hour for shifts that started in this block. */
  netHourlyRate: number;
  shiftCount: number;
}

/** Classify a shift into a block by its start hour (Malaysia time). */
export function timeBlockOf(shift: Shift): TimeBlockKey {
  const h = new Date(new Date(shift.shift_start).getTime() + MYT_OFFSET_MS).getUTCHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "night";
}

export function timeOfDayHeatmap(
  shifts: Shift[],
  ratePerL: number
): TimeBlockStat[] {
  const blocks: Record<TimeBlockKey, { label: string; hours: number; net: number; shiftCount: number }> = {
    morning: { label: "Morning (5a–12p)", hours: 0, net: 0, shiftCount: 0 },
    afternoon: { label: "Afternoon (12p–6p)", hours: 0, net: 0, shiftCount: 0 },
    night: { label: "Night (6p–5a)", hours: 0, net: 0, shiftCount: 0 },
  };

  shifts
    .filter((s) => s.shift_end && s.end_mileage != null)
    .forEach((s) => {
      const block = blocks[timeBlockOf(s)];
      const f = shiftFinancials(s, ratePerL);
      block.hours += f.hours;
      block.net += f.net;
      block.shiftCount += 1;
    });

  return (Object.keys(blocks) as TimeBlockKey[]).map((key) => {
    const b = blocks[key];
    return {
      key,
      label: b.label,
      hours: b.hours,
      net: b.net,
      netHourlyRate: b.hours > 0 ? b.net / b.hours : 0,
      shiftCount: b.shiftCount,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

export function rm(value: number): string {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function km(value: number): string {
  return `${Math.round(value).toLocaleString("en-MY")} km`;
}

export function liters(value: number): string {
  return `${value.toLocaleString("en-MY", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} L`;
}

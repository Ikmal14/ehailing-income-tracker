import { describe, expect, it } from "vitest";
import {
  aggregateFinancials,
  currentMonthLitersPumped,
  currentMonthQuotaLiters,
  currentOdometer,
  effectiveFuelRate,
  milestoneProgress,
  previousMonthDistanceKm,
  quotaStatus,
  shiftDistanceKm,
  shiftFinancials,
  shiftGrossEarnings,
  timeBlockOf,
} from "./calculations";
import {
  MILESTONES,
  SUBSIDISED_FUEL_RATE,
  FUEL_EFFICIENCY_KM_PER_L,
  SERVICE_SINKING_FUND_PER_KM,
} from "./constants";
import type { FuelLog, MaintenanceLog, Shift } from "./types";

/* Fixed reference date: 15 June 2026 (a Monday), local time. */
const REF = new Date(2026, 5, 15, 12, 0, 0);

function makeShift(partial: Partial<Shift>): Shift {
  return {
    id: crypto.randomUUID(),
    user_id: "u1",
    created_at: new Date().toISOString(),
    shift_start: new Date(2026, 5, 2, 8, 0, 0).toISOString(),
    shift_end: new Date(2026, 5, 2, 16, 0, 0).toISOString(),
    start_mileage: 30000,
    end_mileage: 30100,
    earnings: {
      platforms: { Grab: 100 },
      cash_vs_wallet: { cash: 40, wallet: 60 },
    },
    expenses: { tolls: 0, parking: 0 },
    ...partial,
  };
}

function makeFuel(partial: Partial<FuelLog>): FuelLog {
  return {
    id: crypto.randomUUID(),
    user_id: "u1",
    date: new Date(2026, 5, 5).toISOString(),
    odometer: 30500,
    liters_pumped: 30,
    total_cost: 59.7,
    ...partial,
  };
}

describe("shift primitives", () => {
  it("sums per-platform gross earnings", () => {
    const s = makeShift({
      earnings: {
        platforms: { Grab: 120.5, Bolt: 30, inDrive: 10 },
        cash_vs_wallet: { cash: 0, wallet: 0 },
      },
    });
    expect(shiftGrossEarnings(s)).toBeCloseTo(160.5);
  });

  it("computes distance and clamps negatives to 0", () => {
    expect(shiftDistanceKm(makeShift({ start_mileage: 100, end_mileage: 250 }))).toBe(150);
    expect(shiftDistanceKm(makeShift({ start_mileage: 250, end_mileage: 100 }))).toBe(0);
    expect(shiftDistanceKm(makeShift({ end_mileage: null }))).toBe(0);
  });
});

describe("APAD BUDI95 tiered quota", () => {
  it("maps previous-month distance to the correct quota tier", () => {
    expect(currentMonthQuotaLiters(0)).toBe(200);
    expect(currentMonthQuotaLiters(1999)).toBe(200);
    expect(currentMonthQuotaLiters(2000)).toBe(600);
    expect(currentMonthQuotaLiters(4999)).toBe(600);
    expect(currentMonthQuotaLiters(5000)).toBe(800);
    expect(currentMonthQuotaLiters(99999)).toBe(800);
  });

  it("sums only previous-month shift distance", () => {
    const shifts = [
      // May (previous month): 3000 km
      makeShift({
        shift_start: new Date(2026, 4, 10, 8).toISOString(),
        start_mileage: 0,
        end_mileage: 3000,
      }),
      // June (current month): should be excluded
      makeShift({
        shift_start: new Date(2026, 5, 10, 8).toISOString(),
        start_mileage: 3000,
        end_mileage: 4000,
      }),
    ];
    expect(previousMonthDistanceKm(shifts, REF)).toBe(3000);
  });

  it("sums only current-month litres pumped", () => {
    const logs = [
      makeFuel({ date: new Date(2026, 5, 3).toISOString(), liters_pumped: 35 }),
      makeFuel({ date: new Date(2026, 5, 20).toISOString(), liters_pumped: 40 }),
      makeFuel({ date: new Date(2026, 4, 28).toISOString(), liters_pumped: 99 }), // May -> excluded
    ];
    expect(currentMonthLitersPumped(logs, REF)).toBe(75);
  });

  it("selects 600 L quota and reports usage status", () => {
    const shifts = [
      makeShift({
        shift_start: new Date(2026, 4, 10, 8).toISOString(),
        start_mileage: 0,
        end_mileage: 3000, // -> 600 L tier
      }),
    ];
    const logs = [makeFuel({ date: new Date(2026, 5, 3).toISOString(), liters_pumped: 150 })];
    const q = quotaStatus(shifts, logs, REF);
    expect(q.quotaLiters).toBe(600);
    expect(q.usedLiters).toBe(150);
    expect(q.remainingLiters).toBe(450);
    expect(q.exceeded).toBe(false);
    expect(q.usedRatio).toBeCloseTo(0.25);
  });

  it("switches to floating rate once quota is exceeded", () => {
    const shifts = [
      makeShift({
        shift_start: new Date(2026, 4, 10, 8).toISOString(),
        start_mileage: 0,
        end_mileage: 1000, // -> 200 L tier
      }),
    ];
    const within = [makeFuel({ date: new Date(2026, 5, 3).toISOString(), liters_pumped: 100 })];
    const over = [makeFuel({ date: new Date(2026, 5, 3).toISOString(), liters_pumped: 250 })];

    expect(effectiveFuelRate(shifts, within, 2.6, REF)).toBe(SUBSIDISED_FUEL_RATE);
    expect(effectiveFuelRate(shifts, over, 2.6, REF)).toBe(2.6);
  });
});

describe("financials", () => {
  it("computes net profit = gross - fuel - service - opex", () => {
    const s = makeShift({
      start_mileage: 0,
      end_mileage: 210, // 210 km -> 10 L at 21 km/L
      earnings: { platforms: { Grab: 200 }, cash_vs_wallet: { cash: 0, wallet: 0 } },
      expenses: { tolls: 5, parking: 3 },
    });
    const f = shiftFinancials(s, SUBSIDISED_FUEL_RATE);
    expect(f.gross).toBe(200);
    expect(f.fuelCost).toBeCloseTo((210 / FUEL_EFFICIENCY_KM_PER_L) * SUBSIDISED_FUEL_RATE); // 10 * 1.99 = 19.9
    expect(f.serviceAllocation).toBeCloseTo(210 * SERVICE_SINKING_FUND_PER_KM); // 6.72
    expect(f.manualOpex).toBe(8);
    expect(f.net).toBeCloseTo(200 - 19.9 - 6.72 - 8);
  });

  it("aggregates hourly rates over closed shifts only", () => {
    const shifts = [
      makeShift({
        shift_start: new Date(2026, 5, 2, 8).toISOString(),
        shift_end: new Date(2026, 5, 2, 12).toISOString(), // 4h
        start_mileage: 0,
        end_mileage: 100,
        earnings: { platforms: { Grab: 100 }, cash_vs_wallet: { cash: 0, wallet: 0 } },
      }),
      makeShift({ shift_end: null, end_mileage: null }), // open -> ignored
    ];
    const agg = aggregateFinancials(shifts, SUBSIDISED_FUEL_RATE);
    expect(agg.shiftCount).toBe(1);
    expect(agg.hours).toBeCloseTo(4);
    expect(agg.grossHourlyRate).toBeCloseTo(25);
  });
});

describe("time block classification", () => {
  it("buckets by start hour", () => {
    expect(timeBlockOf(makeShift({ shift_start: new Date(2026, 5, 2, 7).toISOString() }))).toBe("morning");
    expect(timeBlockOf(makeShift({ shift_start: new Date(2026, 5, 2, 14).toISOString() }))).toBe("afternoon");
    expect(timeBlockOf(makeShift({ shift_start: new Date(2026, 5, 2, 22).toISOString() }))).toBe("night");
    expect(timeBlockOf(makeShift({ shift_start: new Date(2026, 5, 2, 3).toISOString() }))).toBe("night");
  });
});

describe("milestones & odometer", () => {
  it("derives current odometer from max shift end mileage", () => {
    const shifts = [
      makeShift({ end_mileage: 31000 }),
      makeShift({ end_mileage: 32500 }),
    ];
    expect(currentOdometer(shifts)).toBe(32500);
  });

  it("computes interval-based battery progress from last replacement", () => {
    const battery = MILESTONES.find((m) => m.key === "battery")!;
    const shifts = [makeShift({ end_mileage: 40000 })];
    const logs: MaintenanceLog[] = [
      {
        id: "m1",
        user_id: "u1",
        date: new Date(2026, 0, 1).toISOString(),
        part_name: "Battery",
        replaced_at_odometer: 32000,
        cost: 320,
      },
    ];
    const p = milestoneProgress(battery, shifts, logs);
    expect(p.lastReplacedOdometer).toBe(32000);
    expect(p.dueOdometer).toBe(32000 + 25000); // 57000
    expect(p.kmUsed).toBe(8000);
    expect(p.kmRemaining).toBe(17000);
    expect(p.overdue).toBe(false);
  });

  it("uses the 40k target for an un-serviced major service", () => {
    const major = MILESTONES.find((m) => m.key === "major_service")!;
    const shifts = [makeShift({ end_mileage: 36000 })];
    const p = milestoneProgress(major, shifts, []);
    expect(p.dueOdometer).toBe(40000);
    expect(p.kmRemaining).toBe(4000);
  });
});

/** Shared domain types mirroring the Supabase schema. */

export interface EarningsCashWallet {
  cash: number;
  wallet: number;
}

export interface ShiftEarnings {
  /** Per-platform gross amounts, e.g. { Grab: 120.5, Bolt: 30 }. */
  platforms: Record<string, number>;
  cash_vs_wallet: EarningsCashWallet;
}

export interface ShiftExpenses {
  tolls: number;
  parking: number;
}

export interface Shift {
  id: string;
  user_id: string;
  created_at: string;
  shift_start: string;
  shift_end: string | null;
  start_mileage: number;
  end_mileage: number | null;
  earnings: ShiftEarnings | null;
  expenses: ShiftExpenses | null;
}

export interface FuelLog {
  id: string;
  user_id: string;
  date: string;
  odometer: number;
  liters_pumped: number;
  total_cost: number;
}

export interface MaintenanceLog {
  id: string;
  user_id: string;
  date: string;
  part_name: string;
  replaced_at_odometer: number;
  cost: number;
}

export interface AppSettings {
  floatingFuelRate: number;
}

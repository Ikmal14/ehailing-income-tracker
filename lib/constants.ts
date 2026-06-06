/**
 * System constants for the 2025 Perodua Bezza X 1.3L observability engine.
 * These are the calibrated baselines referenced across costing and milestone logic.
 */

export const VEHICLE = {
  name: "2025 Perodua Bezza X 1.3L",
  baselineMileageKm: 30_000,
} as const;

/** Fuel efficiency baseline (km per litre). */
export const FUEL_EFFICIENCY_KM_PER_L = 21.0;

/** Subsidised BUDI95 fuel rate (RM / L). */
export const SUBSIDISED_FUEL_RATE = 1.99;

/**
 * Default floating market rate (RM / L). Used once the monthly subsidised
 * quota is exceeded. This is overridable from the Settings UI.
 */
export const DEFAULT_FLOATING_FUEL_RATE = 2.6;

/** Service sinking fund accrual (RM / km), recalibrated for the 1.3L engine. */
export const SERVICE_SINKING_FUND_PER_KM = 0.032;

/**
 * APAD e-hailing subsidised fuel monthly quota tiers, evaluated against the
 * total distance driven in the *previous* calendar month.
 */
export const APAD_QUOTA_TIERS = [
  { maxDistanceKm: 2_000, quotaLiters: 200 },
  { maxDistanceKm: 5_000, quotaLiters: 600 },
  { maxDistanceKm: Infinity, quotaLiters: 800 },
] as const;

/** Maintenance milestone definitions tracked by the sinking-fund visualizer. */
export interface Milestone {
  key: "major_service" | "battery" | "tyres";
  /** Canonical part name stored in `maintenance_logs.part_name`. */
  partName: string;
  label: string;
  /**
   * For interval-based parts (battery, tyres) this is the service lifespan in km.
   * For the fixed 40k major service this is undefined (it uses `targetOdometer`).
   */
  intervalKm?: number;
  /** For the one-off 40,000 km major service milestone. */
  targetOdometer?: number;
  cost: number;
}

export const MILESTONES: Milestone[] = [
  {
    key: "major_service",
    partName: "Major Service",
    label: "40,000 km Major Service",
    targetOdometer: 40_000,
    cost: 631,
  },
  {
    key: "battery",
    partName: "Battery",
    label: "M42 EFB Battery (Eco Idle)",
    intervalKm: 25_000,
    cost: 320,
  },
  {
    key: "tyres",
    partName: "Tyres",
    label: "175/65 R14 Tyres",
    intervalKm: 45_000,
    cost: 650,
  },
];

/** Known e-hailing platforms used to seed the earnings split UI. */
export const PLATFORMS = ["Grab", "Bolt", "inDrive"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SETTINGS_STORAGE_KEY = "ehailing.settings.v1";

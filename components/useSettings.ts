"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FLOATING_FUEL_RATE, SETTINGS_STORAGE_KEY } from "@/lib/constants";
import type { AppSettings } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  floatingFuelRate: DEFAULT_FLOATING_FUEL_RATE,
};

/**
 * Persists user-adjustable settings (currently the floating market fuel rate)
 * in localStorage so the zero-cost stack needs no extra DB table.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  return { settings, update, loaded };
}

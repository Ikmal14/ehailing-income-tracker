import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import type { FuelLog, MaintenanceLog, Shift } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [shiftsRes, fuelRes, maintRes] = await Promise.all([
    supabase
      .from("shifts")
      .select("*")
      .order("shift_start", { ascending: false }),
    supabase.from("fuel_logs").select("*").order("date", { ascending: false }),
    supabase
      .from("maintenance_logs")
      .select("*")
      .order("date", { ascending: false }),
  ]);

  const shifts = (shiftsRes.data ?? []) as Shift[];
  const fuelLogs = (fuelRes.data ?? []) as FuelLog[];
  const maintenanceLogs = (maintRes.data ?? []) as MaintenanceLog[];

  return (
    <Dashboard
      userEmail={user.email ?? ""}
      shifts={shifts}
      fuelLogs={fuelLogs}
      maintenanceLogs={maintenanceLogs}
    />
  );
}

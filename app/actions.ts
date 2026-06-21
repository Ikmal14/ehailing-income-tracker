"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ShiftEarnings, ShiftExpenses } from "@/lib/types";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function num(value: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/* ----------------------------- Shifts ----------------------------- */

export async function startShift(formData: FormData) {
  const { supabase, user } = await requireUser();
  const startMileage = num(formData.get("start_mileage"));
  const startOverride = String(formData.get("shift_start") || "");

  // Never allow two open shifts at once — that makes the logger keep showing the
  // "end shift" form after one is closed. If one is already open, just keep it.
  const { data: existingOpen } = await supabase
    .from("shifts")
    .select("id")
    .eq("user_id", user.id)
    .is("shift_end", null)
    .limit(1);
  if (existingOpen && existingOpen.length > 0) {
    revalidatePath("/");
    return;
  }

  const { error } = await supabase.from("shifts").insert({
    user_id: user.id,
    shift_start: startOverride ? new Date(startOverride).toISOString() : new Date().toISOString(),
    start_mileage: startMileage,
    earnings: { platforms: {}, cash_vs_wallet: { cash: 0, wallet: 0 } },
    expenses: { tolls: 0, parking: 0 },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function endShift(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("shift_id") || "");
  if (!id) throw new Error("Missing shift id");

  const endOverride = String(formData.get("shift_end") || "");
  const endMileage = num(formData.get("end_mileage"));

  // Build platform earnings dynamically from grab/bolt/indrive fields.
  const platforms: Record<string, number> = {};
  for (const key of ["Grab", "Bolt", "inDrive"]) {
    const v = num(formData.get(`platform_${key}`));
    if (v > 0) platforms[key] = v;
  }
  const custom = String(formData.get("platform_custom_name") || "").trim();
  const customAmt = num(formData.get("platform_custom_amount"));
  if (custom && customAmt > 0) platforms[custom] = customAmt;

  const earnings: ShiftEarnings = {
    platforms,
    cash_vs_wallet: {
      cash: num(formData.get("cash")),
      wallet: num(formData.get("wallet")),
    },
  };

  const expenses: ShiftExpenses = {
    tolls: num(formData.get("tolls")),
    parking: num(formData.get("parking")),
  };

  const { error } = await supabase
    .from("shifts")
    .update({
      shift_end: endOverride ? new Date(endOverride).toISOString() : new Date().toISOString(),
      end_mileage: endMileage,
      earnings,
      expenses,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // Safety net: close any other stray open shifts so the logger always returns
  // to the "start shift" screen (no lingering open shift can keep the end form up).
  const { data: strays } = await supabase
    .from("shifts")
    .select("id, shift_start, start_mileage")
    .eq("user_id", user.id)
    .is("shift_end", null);
  for (const s of strays ?? []) {
    await supabase
      .from("shifts")
      .update({ shift_end: s.shift_start, end_mileage: s.start_mileage })
      .eq("id", s.id)
      .eq("user_id", user.id);
  }

  revalidatePath("/");
}

export async function deleteShift(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("shift_id") || "");
  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* --------------------------- Fuel logs ---------------------------- */

export async function addFuelLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const dateStr = String(formData.get("date") || "");
  const { error } = await supabase.from("fuel_logs").insert({
    user_id: user.id,
    date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
    odometer: num(formData.get("odometer")),
    liters_pumped: num(formData.get("liters_pumped")),
    total_cost: num(formData.get("total_cost")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteFuelLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const { error } = await supabase
    .from("fuel_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* ------------------------ Maintenance logs ------------------------ */

export async function addMaintenanceLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const dateStr = String(formData.get("date") || "");
  const { error } = await supabase.from("maintenance_logs").insert({
    user_id: user.id,
    date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
    part_name: String(formData.get("part_name") || "").trim(),
    replaced_at_odometer: num(formData.get("replaced_at_odometer")),
    cost: num(formData.get("cost")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteMaintenanceLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const { error } = await supabase
    .from("maintenance_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* ------------------------------ Auth ------------------------------ */

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .limit(1)
    .single();

  if (membershipError || !membership) throw new Error("No organisation membership found for this user.");

  const payload = {
    organisation_id: membership.organisation_id,
    name: String(formData.get("name") ?? "").trim(),
    domain: String(formData.get("domain") ?? "").trim(),
    status: String(formData.get("status") ?? "active"),
    monthly_fee: Number(formData.get("monthly_fee") || 0),
    start_date: String(formData.get("start_date") || "") || null
  };

  const { error } = await supabase.from("clients").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

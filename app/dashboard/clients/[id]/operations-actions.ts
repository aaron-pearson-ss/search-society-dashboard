"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateClientOperations(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const services = String(formData.get("services") || "").split(",").map(v=>v.trim()).filter(Boolean);
  const { error } = await supabase.from("clients").update({
    monthly_fee: Number(formData.get("monthly_fee") || 0),
    renewal_date: String(formData.get("renewal_date") || "") || null,
    health_score: Math.max(0, Math.min(100, Number(formData.get("health_score") || 75))),
    health_note: String(formData.get("health_note") || "").trim() || null,
    services,
    updated_at: new Date().toISOString(),
  }).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard");
}

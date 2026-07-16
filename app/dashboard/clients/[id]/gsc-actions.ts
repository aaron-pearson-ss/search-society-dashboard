"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncSearchConsoleProperty } from "@/lib/google/sync-property";


export async function assignGscProperty(clientId: string, formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) redirect(`/dashboard/clients/${clientId}?gsc=choose-property`);
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("organisation_id").eq("id", clientId).single();
  if (!client) redirect("/dashboard/clients");

  await supabase.from("gsc_properties").update({ client_id: null, updated_at: new Date().toISOString() }).eq("client_id", clientId);
  const { error } = await supabase.from("gsc_properties").update({ client_id: clientId, updated_at: new Date().toISOString() }).eq("id", propertyId).eq("organisation_id", client.organisation_id);
  if (error) redirect(`/dashboard/clients/${clientId}?gsc=assign-failed`);
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/clients/${clientId}?gsc=property-linked`);
}

export async function syncGscPerformance(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("gsc_properties")
    .select("id, organisation_id, client_id, site_url, google_connection_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!property?.client_id) redirect(`/dashboard/clients/${clientId}?gsc=no-linked-property`);

  try {
    await syncSearchConsoleProperty({ supabase, property, startedBy: user.id });
  } catch {
    redirect(`/dashboard/clients/${clientId}?gsc=sync-failed`);
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/clients/${clientId}?gsc=sync-complete`);
}

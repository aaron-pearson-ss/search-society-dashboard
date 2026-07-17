"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncGa4Property } from "@/lib/google/sync-ga4-property";

export async function assignGa4Property(clientId:string, formData:FormData) {
  const propertyId=String(formData.get("propertyId")??""); if(!propertyId) redirect(`/dashboard/clients/${clientId}/analytics?ga4=choose-property`);
  const supabase=await createClient(); const {data:client}=await supabase.from("clients").select("organisation_id").eq("id",clientId).single(); if(!client) redirect("/dashboard/clients");
  await supabase.from("ga4_properties").update({client_id:null,updated_at:new Date().toISOString()}).eq("client_id",clientId);
  const {error}=await supabase.from("ga4_properties").update({client_id:clientId,updated_at:new Date().toISOString()}).eq("id",propertyId).eq("organisation_id",client.organisation_id);
  if(error) redirect(`/dashboard/clients/${clientId}/analytics?ga4=assign-failed`);
  revalidatePath(`/dashboard/clients/${clientId}/analytics`); redirect(`/dashboard/clients/${clientId}/analytics?ga4=property-linked`);
}

export async function syncGa4Performance(clientId:string) {
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:property}=await supabase.from("ga4_properties").select("*").eq("client_id",clientId).maybeSingle();
  if(!property) redirect(`/dashboard/clients/${clientId}/analytics?ga4=no-linked-property`);
  try { await syncGa4Property({supabase,property,startedBy:user.id}); } catch { redirect(`/dashboard/clients/${clientId}/analytics?ga4=sync-failed`); }
  revalidatePath(`/dashboard/clients/${clientId}/analytics`); redirect(`/dashboard/clients/${clientId}/analytics?ga4=sync-complete`);
}

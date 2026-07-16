"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createReport(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase.from("clients").select("organisation_id").eq("id", clientId).single();
  if (!client) redirect(`/dashboard/clients/${clientId}?report=client-not-found`);

  const payload = {
    organisation_id: client.organisation_id,
    client_id: clientId,
    created_by: user.id,
    title: String(formData.get("title") ?? "Monthly SEO report"),
    date_from: String(formData.get("date_from")),
    date_to: String(formData.get("date_to")),
    comparison_date_from: String(formData.get("comparison_date_from")),
    comparison_date_to: String(formData.get("comparison_date_to")),
    executive_summary: String(formData.get("executive_summary") ?? ""),
    work_completed: String(formData.get("work_completed") ?? ""),
    next_steps: String(formData.get("next_steps") ?? ""),
  };

  const { data, error } = await supabase.from("client_reports").insert(payload).select("id").single();
  if (error || !data) redirect(`/dashboard/clients/${clientId}/reports/new?error=create-failed`);
  redirect(`/dashboard/reports/${data.id}`);
}

export async function updateReport(reportId: string, formData: FormData) {
  const supabase = await createClient();
  const status = String(formData.get("status") ?? "draft");
  const payload = {
    title: String(formData.get("title") ?? "Monthly SEO report"),
    executive_summary: String(formData.get("executive_summary") ?? ""),
    work_completed: String(formData.get("work_completed") ?? ""),
    next_steps: String(formData.get("next_steps") ?? ""),
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("client_reports").update(payload).eq("id", reportId);
  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath("/dashboard/reports");
}

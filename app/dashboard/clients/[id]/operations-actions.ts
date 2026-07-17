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

const validRoadmapStages = ["planned", "in_progress", "complete"] as const;

export async function updateClientActionPlanTask(
  clientId: string,
  taskId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update the action plan.");
  }

  const stageValue = String(
    formData.get("roadmap_stage") ?? "planned"
  );
  const roadmapStage = validRoadmapStages.includes(
    stageValue as (typeof validRoadmapStages)[number]
  )
    ? stageValue
    : "planned";
  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const roadmapOrder = Math.max(
    0,
    Number(formData.get("roadmap_order") ?? 0)
  );
  const clientVisible = formData.get("client_visible") === "on";

  const { error } = await supabase
    .from("tasks")
    .update({
      client_visible: clientVisible,
      roadmap_stage: roadmapStage,
      roadmap_order: roadmapOrder,
      owner_id: ownerId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Unable to update action plan: ${error.message}`);
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/reports");
}

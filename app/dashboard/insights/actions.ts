"use server";

import { revalidatePath } from "next/cache";
import { generateInsightsForClient } from "@/lib/insights/generate-client-insights";
import { createClient } from "@/lib/supabase/server";

export async function generateClientInsights(clientId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to generate insights.");
  }

  await generateInsightsForClient({ supabase, clientId, resetStatus: true });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/insights");
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function setInsightStatus(
  insightId: string,
  status: "reviewed" | "dismissed"
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to update an insight.");
  }

  const { error } = await supabase
    .from("client_insights")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", insightId);

  if (error) {
    throw new Error(`Unable to update insight: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/insights");
}

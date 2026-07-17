"use server";

import { revalidatePath } from "next/cache";
import { generateInsightsForClient } from "@/lib/insights/generate-client-insights";
import { createClient } from "@/lib/supabase/server";

type InsightPriority = "high" | "medium" | "low";

function addWorkingDays(start: Date, workingDays: number): Date {
  const result = new Date(start);
  let added = 0;

  while (added < workingDays) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();

    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return result;
}

function dueDateForPriority(priority: InsightPriority): string {
  const workingDays =
    priority === "high" ? 3 : priority === "medium" ? 7 : 14;

  return addWorkingDays(new Date(), workingDays)
    .toISOString()
    .slice(0, 10);
}

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

export async function createTaskFromInsight(
  insightId: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to create a task.");
  }

  const { data: insight, error: insightError } = await supabase
    .from("client_insights")
    .select(
      "id,organisation_id,client_id,title,summary,recommendation,severity,priority,impact_score,status"
    )
    .eq("id", insightId)
    .single();

  if (insightError || !insight) {
    throw new Error(
      `Unable to load insight: ${insightError?.message ?? "Insight not found"}`
    );
  }

  const { data: existingTask, error: existingTaskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("source_insight_id", insightId)
    .maybeSingle();

  if (existingTaskError) {
    throw new Error(
      `Unable to check for an existing task: ${existingTaskError.message}`
    );
  }

  if (!existingTask) {
    const priority = insight.priority as InsightPriority;
    const description = [
      insight.summary,
      "",
      `Recommended action: ${insight.recommendation ?? "Review and action this finding."}`,
      "",
      `Source insight score: ${insight.impact_score}/100`,
      `Source severity: ${insight.severity}`,
    ].join("\n");

    const { error: insertError } = await supabase.from("tasks").insert({
      organisation_id: insight.organisation_id,
      client_id: insight.client_id,
      source_insight_id: insight.id,
      title: insight.title,
      description,
      status: "todo",
      priority,
      due_date: dueDateForPriority(priority),
      is_recurring: false,
      recurrence_rule: null,
      created_by: user.id,
    });

    if (insertError) {
      if (insertError.code !== "23505") {
        throw new Error(
          `Unable to create task from insight: ${insertError.message}`
        );
      }
    }
  }

  const { error: reviewError } = await supabase
    .from("client_insights")
    .update({
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", insightId);

  if (reviewError) {
    throw new Error(
      `Task was created, but the insight could not be marked reviewed: ${reviewError.message}`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/insights");
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/dashboard/clients/${insight.client_id}`);
}

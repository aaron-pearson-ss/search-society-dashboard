"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const validStatuses = ["todo", "in_progress", "blocked", "done"] as const;
const validPriorities = ["low", "medium", "high", "urgent"] as const;

type TaskStatus = (typeof validStatuses)[number];

export async function createTask(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create a task.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    throw new Error("No organisation membership was found.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const priorityValue = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const isRecurring = formData.get("is_recurring") === "on";
  const recurrenceRule = String(
    formData.get("recurrence_rule") ?? ""
  ).trim();

  if (!title) {
    throw new Error("A task title is required.");
  }

  const priority = validPriorities.includes(
    priorityValue as (typeof validPriorities)[number]
  )
    ? priorityValue
    : "medium";

  const { error } = await supabase.from("tasks").insert({
    organisation_id: membership.organisation_id,
    client_id: clientId || null,
    owner_id: ownerId || null,
    title,
    description: description || null,
    status: "todo",
    priority,
    due_date: dueDate || null,
    is_recurring: isRecurring,
    recurrence_rule: isRecurring ? recurrenceRule || null : null,
    created_by: user.id,
  });

  if (error) {
    throw new Error(`Unable to create task: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

export async function updateTask(
  taskId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update a task.");
  }

  const statusValue = String(formData.get("status") ?? "");
  const submittedOwnerId = String(
    formData.get("owner_id") ?? ""
  ).trim();
  const completionNote = String(
    formData.get("completion_note") ?? ""
  ).trim();

  if (!validStatuses.includes(statusValue as TaskStatus)) {
    throw new Error("Invalid task status.");
  }

  const status = statusValue as TaskStatus;

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(
      "id,client_id,source_insight_id,owner_id,completion_note"
    )
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error(
      `Unable to load task: ${
        taskError?.message ?? "Task not found"
      }`
    );
  }

  const finalOwnerId =
    submittedOwnerId || task.owner_id || user.id;

  const finalCompletionNote =
    status === "done"
      ? completionNote ||
        task.completion_note ||
        "Task completed."
      : null;

  const completedAt =
    status === "done" ? new Date().toISOString() : null;

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status,
      owner_id: finalOwnerId,
      completion_note: finalCompletionNote,
      completed_at: completedAt,
      completed_by: status === "done" ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateError) {
    throw new Error(
      `Unable to update task: ${updateError.message}`
    );
  }

  if (task.source_insight_id) {
    const { error: insightError } = await supabase
      .from("client_insights")
      .update({
        status: status === "done" ? "resolved" : "reviewed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", task.source_insight_id);

    if (insightError) {
      throw new Error(
        `Task updated, but its linked insight could not be updated: ${insightError.message}`
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/insights");

  if (task.client_id) {
    revalidatePath(`/dashboard/clients/${task.client_id}`);
  }
}
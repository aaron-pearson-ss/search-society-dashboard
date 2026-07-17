"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const validStatuses = ["todo", "in_progress", "blocked", "done"];
const validPriorities = ["low", "medium", "high", "urgent"];

export async function createTask(formData: FormData) {
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
  const priorityValue = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const isRecurring = formData.get("is_recurring") === "on";
  const recurrenceRule = String(
    formData.get("recurrence_rule") ?? ""
  ).trim();

  if (!title) {
    throw new Error("A task title is required.");
  }

  const priority = validPriorities.includes(priorityValue)
    ? priorityValue
    : "medium";

  const { error } = await supabase.from("tasks").insert({
    organisation_id: membership.organisation_id,
    client_id: clientId || null,
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

export async function updateTaskStatus(
  taskId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update a task.");
  }

  const statusValue = String(formData.get("status") ?? "");

  if (!validStatuses.includes(statusValue)) {
    throw new Error("Invalid task status.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: statusValue,
      completed_at:
        statusValue === "done" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(`Unable to update task: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

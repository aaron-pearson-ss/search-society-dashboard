"use client";

import { updateClientActionPlanTask } from "./operations-actions";

type Member = {
  user_id: string;
  display_name: string;
  email: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner_id: string | null;
  due_date: string | null;
  client_visible: boolean;
  roadmap_stage: string;
  roadmap_order: number;
  completion_note: string | null;
};

function memberLabel(member: Member) {
  return member.display_name || member.email || "Team member";
}

export function ClientActionPlan({
  clientId,
  tasks,
  members,
}: {
  clientId: string;
  tasks: Task[];
  members: Member[];
}) {
  const visibleTasks = tasks.filter((task) => task.client_visible);
  const completed = visibleTasks.filter(
    (task) => task.roadmap_stage === "complete"
  ).length;
  const progress = visibleTasks.length
    ? Math.round((completed / visibleTasks.length) * 100)
    : 0;

  return (
    <section className="mt-6 app-card p-6 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-lime-700">Client roadmap</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Action plan
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose which tasks clients can see and organise them into a clear
            delivery roadmap.
          </p>
        </div>

        <div className="min-w-44">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>{visibleTasks.length} visible item(s)</span>
            <span>{progress}% complete</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-lime-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {tasks.length ? (
        <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {tasks.map((task) => (
            <form
              key={`${task.id}-${task.client_visible}-${task.roadmap_stage}-${task.owner_id}`}
              action={updateClientActionPlanTask.bind(
                null,
                clientId,
                task.id
              )}
              className="grid gap-4 p-5 lg:grid-cols-[1.5fr_.8fr_.9fr_.4fr_auto] lg:items-end"
            >
              <div>
                <p className="font-bold text-slate-900">{task.title}</p>
                <p className="mt-1 text-xs capitalize text-slate-400">
                  {task.status.replace("_", " ")} · {task.priority} priority
                </p>
              </div>

              <label className="text-xs font-bold text-slate-500">
                Roadmap stage
                <select
                  name="roadmap_stage"
                  defaultValue={task.roadmap_stage}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="complete">Complete</option>
                </select>
              </label>

              <label className="text-xs font-bold text-slate-500">
                Owner
                <select
                  name="owner_id"
                  defaultValue={task.owner_id ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {memberLabel(member)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold text-slate-500">
                Order
                <input
                  name="roadmap_order"
                  type="number"
                  min="0"
                  defaultValue={task.roadmap_order}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </label>

              <div className="flex items-center gap-3 lg:pb-0.5">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="client_visible"
                    defaultChecked={task.client_visible}
                  />
                  Client visible
                </label>

                <button
                  type="submit"
                  className="btn-interactive rounded-xl bg-[#181818] px-4 py-2 text-sm font-bold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-bold text-slate-800">No client tasks yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create tasks for this client, then return here to add them to the
            client-facing roadmap.
          </p>
        </div>
      )}
    </section>
  );
}

import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { createTask, updateTaskStatus } from "./actions";

const priorityStyle: Record<string, string> = {
  urgent: "bg-rose-50 text-rose-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,due_date,is_recurring,recurrence_rule,client:clients(id,name)"
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id,name")
      .in("status", ["active", "onboarding"])
      .order("name"),
  ]);

  const openTasks = (tasks ?? []).filter((task) => task.status !== "done");

  const today = new Date().toISOString().slice(0, 10);

  const overdueTasks = openTasks.filter(
    (task) => task.due_date && task.due_date < today
  );

  const recurringTasks = (tasks ?? []).filter((task) => task.is_recurring);

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#181818]">
            Agency operations
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">
            Tasks &amp; deliverables
          </h1>

          <p className="mt-2 text-slate-500">
            Keep every client commitment, deadline and recurring deliverable
            visible.
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Open tasks", openTasks.length],
          ["Overdue", overdueTasks.length],
          ["Recurring", recurringTasks.length],
        ].map(([label, value]) => (
          <article key={String(label)} className="app-card p-5">
            <p className="text-sm font-semibold text-slate-500">{label}</p>

            <p className="mt-3 text-3xl font-bold text-[#181818]">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createTask} className="app-card h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-100">
              <Icons.plus className="h-5 w-5" />
            </span>

            <div>
              <h2 className="font-bold text-slate-900">New task</h2>

              <p className="text-sm text-slate-500">
                Add a one-off or recurring deliverable.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Task title

              <input
                required
                name="title"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                placeholder="Monthly SEO report"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Client

              <select
                name="client_id"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option value="">Agency-wide</option>

                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Priority

                <select
                  name="priority"
                  defaultValue="medium"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Due date

                <input
                  type="date"
                  name="due_date"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Notes

              <textarea
                name="description"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="is_recurring" />
              Recurring deliverable
            </label>

            <input
              name="recurrence_rule"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="e.g. Monthly, first Monday"
            />

            <button
              className="btn-primary w-full justify-center"
              type="submit"
            >
              Add task
            </button>
          </div>
        </form>

        <article className="app-card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-slate-900">Current workload</h2>

            <p className="mt-1 text-sm text-slate-500">
              Sorted by deadline.
            </p>
          </div>

          {tasks?.length ? (
            <div className="divide-y divide-slate-100">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="p-5 sm:flex sm:items-center sm:gap-4"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                      priorityStyle[task.priority] ??
                      priorityStyle.medium
                    }`}
                  >
                    {task.priority}
                  </span>

                  <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                    <p
                      className={`font-bold ${
                        task.status === "done"
                          ? "text-slate-400 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {task.client?.name ?? "Agency-wide"}

                      {task.due_date
                        ? ` · Due ${new Date(
                            `${task.due_date}T00:00:00`
                          ).toLocaleDateString("en-GB")}`
                        : ""}

                      {task.is_recurring
                        ? ` · ${task.recurrence_rule || "Recurring"}`
                        : ""}
                    </p>
                  </div>

                  <form
                    action={updateTaskStatus.bind(null, task.id)}
                    className="mt-3 flex items-center gap-2 sm:mt-0"
                  >
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#181818] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Update
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              No tasks yet.
            </div>
          )}
        </article>
      </section>
    </>
  );
}
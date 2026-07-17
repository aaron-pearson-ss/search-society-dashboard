import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { createTask, updateTask } from "./actions";

const priorityStyle: Record<string, string> = {
  urgent: "bg-rose-50 text-rose-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

const statusStyle: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  blocked: "bg-rose-50 text-rose-700",
  done: "bg-emerald-50 text-emerald-700",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Member = {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
};

function paramValue(
  value: string | string[] | undefined
): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function memberLabel(member: Member): string {
  return member.display_name || member.email || "Team member";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks },
    { data: clients },
    { data: membersData },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,owner_id,due_date,is_recurring,recurrence_rule,source_insight_id,completion_note,completed_at,client:clients(id,name),source_insight:client_insights(id,title,impact_score)"
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id,name")
      .in("status", ["active", "onboarding"])
      .order("name"),
    supabase.rpc("get_organisation_member_directory"),
  ]);

  const members = (membersData ?? []) as Member[];
  const memberById = new Map(
    members.map((member) => [member.user_id, member])
  );

  const view = paramValue(params.view);
  const statusFilter = paramValue(params.status);
  const priorityFilter = paramValue(params.priority);
  const clientFilter = paramValue(params.client);
  const ownerFilter = paramValue(params.owner);

  const allTasks = tasks ?? [];
  const filteredTasks = allTasks.filter((task: any) => {
    if (view === "my" && task.owner_id !== user?.id) return false;
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (clientFilter && task.client?.id !== clientFilter) return false;
    if (ownerFilter && task.owner_id !== ownerFilter) return false;
    return true;
  });

  const openTasks = allTasks.filter((task: any) => task.status !== "done");
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = openTasks.filter(
    (task: any) => task.due_date && task.due_date < today
  );
  const myOpenTasks = openTasks.filter(
    (task: any) => task.owner_id === user?.id
  );
  const unassignedTasks = openTasks.filter((task: any) => !task.owner_id);

  const workload = members
    .map((member) => ({
      ...member,
      openCount: openTasks.filter(
        (task: any) => task.owner_id === member.user_id
      ).length,
    }))
    .sort((a, b) => b.openCount - a.openCount);

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
            Assign ownership, manage deadlines and close the loop on
            insight-led work.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/tasks"
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              view !== "my"
                ? "bg-[#181818] text-white"
                : "border border-slate-200 bg-white"
            }`}
          >
            All tasks
          </Link>
          <Link
            href="/dashboard/tasks?view=my"
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              view === "my"
                ? "bg-[#181818] text-white"
                : "border border-slate-200 bg-white"
            }`}
          >
            My tasks
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Open tasks", openTasks.length],
          ["My open tasks", myOpenTasks.length],
          ["Overdue", overdueTasks.length],
          ["Unassigned", unassignedTasks.length],
        ].map(([label, value]) => (
          <article key={String(label)} className="app-card p-5">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-[#181818]">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.68fr_1.32fr]">
        <div className="space-y-6">
          <form action={createTask} className="app-card h-fit p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-100">
                <Icons.plus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">New task</h2>
                <p className="text-sm text-slate-500">
                  Add and assign agency work.
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

              <label className="block text-sm font-semibold text-slate-700">
                Assignee
                <select
                  name="owner_id"
                  defaultValue={user?.id ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {memberLabel(member)}
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

          <article className="app-card p-6">
            <h2 className="font-bold text-slate-900">Team workload</h2>
            <p className="mt-1 text-sm text-slate-500">
              Open tasks by assignee.
            </p>

            <div className="mt-5 space-y-3">
              {workload.length ? (
                workload.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between rounded-xl bg-[#f4f1e9] px-4 py-3"
                  >
                    <span className="text-sm font-bold">
                      {memberLabel(member)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold">
                      {member.openCount}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No team members found.
                </p>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <form
            method="get"
            className="app-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            {view ? <input type="hidden" name="view" value={view} /> : null}

            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>

            <select
              name="priority"
              defaultValue={priorityFilter}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              name="client"
              defaultValue={clientFilter}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All clients</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <select
              name="owner"
              defaultValue={ownerFilter}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All assignees</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>

            <button className="rounded-xl bg-[#181818] px-4 py-2 text-sm font-bold text-white">
              Apply filters
            </button>
          </form>

          <article className="app-card overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-slate-900">Current workload</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredTasks.length} task(s) match the current view.
              </p>
            </div>

            {filteredTasks.length ? (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task: any) => {
                  const sourceInsight = Array.isArray(task.source_insight)
                    ? task.source_insight[0]
                    : task.source_insight;
                  const owner = task.owner_id
                    ? memberById.get(task.owner_id)
                    : null;
                  const overdue =
                    task.status !== "done" &&
                    task.due_date &&
                    task.due_date < today;

                  return (
                    <div
                      key={task.id}
                      className={`p-5 ${
                        overdue ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                            priorityStyle[task.priority] ??
                            priorityStyle.medium
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                            statusStyle[task.status] ?? statusStyle.todo
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        {overdue ? (
                          <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                            Overdue
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3">
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
                          {owner
                            ? ` · ${memberLabel(owner)}`
                            : " · Unassigned"}
                          {task.due_date
                            ? ` · Due ${new Date(
                                `${task.due_date}T00:00:00`
                              ).toLocaleDateString("en-GB")}`
                            : ""}
                        </p>

                        {sourceInsight ? (
                          <Link
                            href="/dashboard/insights"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
                          >
                            <Icons.warning className="h-3.5 w-3.5" />
                            From insight · Score{" "}
                            {sourceInsight.impact_score}
                          </Link>
                        ) : null}

                        {task.completion_note ? (
                          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                            <strong>Completion note:</strong>{" "}
                            {task.completion_note}
                          </p>
                        ) : null}
                      </div>

                      <form
                        action={updateTask.bind(null, task.id)}
                        className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[.8fr_1fr_1.5fr_auto]"
                      >
                        <select
                          name="status"
                          defaultValue={task.status}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>

                        <select
                          name="owner_id"
                          defaultValue={task.owner_id ?? ""}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {members.map((member) => (
                            <option
                              key={member.user_id}
                              value={member.user_id}
                            >
                              {memberLabel(member)}
                            </option>
                          ))}
                        </select>

                        <input
                          name="completion_note"
                          defaultValue={task.completion_note ?? ""}
                          placeholder="Completion note required when done"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />

                        <button
                          type="submit"
                          className="rounded-xl bg-[#181818] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Update
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">
                No tasks match these filters.
              </div>
            )}
          </article>
        </div>
      </section>
    </>
  );
}

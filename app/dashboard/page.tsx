import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  onboarding: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/20",
  churned: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const priorityStyle: Record<string, string> = {
  high: "bg-[#181818] text-white",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const staleBefore = new Date(
    Date.now() - 8 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { count: clientCount },
    { data: recentClients },
    { data: properties },
    { count: openTasks },
    { count: overdueTasks },
    { data: atRiskClients },
    { count: highPriorityInsights },
    { data: topPriorities },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("clients")
      .select("id,name,domain,status,monthly_fee,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("gsc_properties")
      .select("id,last_synced_at,client_id")
      .not("client_id", "is", null),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .lt("due_date", new Date().toISOString().slice(0, 10)),
    supabase
      .from("clients")
      .select("id,name,health_score,renewal_date")
      .lt("health_score", 60)
      .order("health_score")
      .limit(5),
    supabase
      .from("client_insights")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .eq("priority", "high"),
    supabase
      .from("client_insights")
      .select(
        "id,title,severity,priority,impact_score,client:clients(id,name)"
      )
      .neq("status", "dismissed")
      .order("impact_score", { ascending: false })
      .limit(5),
  ]);

  const connectedCount = properties?.length ?? 0;
  const staleCount = (properties ?? []).filter(
    (property) =>
      !property.last_synced_at || property.last_synced_at < staleBefore
  ).length;

  const cards = [
    {
      label: "Active clients",
      value: String(clientCount ?? 0),
      note: "Current portfolio",
      icon: Icons.users,
    },
    {
      label: "GSC connections",
      value: String(connectedCount),
      note: `${staleCount} stale connection(s)`,
      icon: Icons.globe,
    },
    {
      label: "Open tasks",
      value: String(openTasks ?? 0),
      note: `${overdueTasks ?? 0} overdue`,
      icon: Icons.tasks,
    },
    {
      label: "Clients at risk",
      value: String(atRiskClients?.length ?? 0),
      note: "Health score below 60",
      icon: Icons.warning,
    },
    {
      label: "High priorities",
      value: String(highPriorityInsights ?? 0),
      note: "New insights needing action",
      icon: Icons.warning,
    },
  ];

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#181818]">
            Workspace overview
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">
            Good morning
          </h1>
          <p className="mt-2 text-slate-500">
            Here’s what’s happening across Search Society today.
          </p>
        </div>

        <Link href="/dashboard/clients/new" className="btn-primary">
          <Icons.plus className="h-4 w-4" />
          Add client
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="app-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-[#181818]">
                  {value}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-50 text-[#181818]">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <article className="app-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Top priorities</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Highest-impact active insights
              </p>
            </div>
            <Link
              href="/dashboard/insights"
              className="text-sm font-bold text-[#181818]"
            >
              View all
            </Link>
          </div>

          {topPriorities?.length ? (
            <div className="divide-y divide-slate-100">
              {topPriorities.map((insight: any) => (
                <Link
                  key={insight.id}
                  href="/dashboard/insights"
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#f4f1e9] sm:px-6"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-50 text-sm font-bold">
                    {insight.impact_score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {insight.title}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {insight.client.name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                      priorityStyle[insight.priority] ?? priorityStyle.low
                    }`}
                  >
                    {insight.priority}
                  </span>
                  <Icons.arrow className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Icons.check className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-3 font-bold">No active priorities</p>
              <p className="mt-1 text-sm text-slate-500">
                Generate insights to score the latest opportunities and risks.
              </p>
            </div>
          )}
        </article>

        <article className="app-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">Recent clients</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Your latest account activity
              </p>
            </div>
            <Link
              href="/dashboard/clients"
              className="text-sm font-bold text-[#181818]"
            >
              View all
            </Link>
          </div>

          {recentClients?.length ? (
            <div className="divide-y divide-slate-100">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#f4f1e9] sm:px-6"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                    {client.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {client.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {client.domain}
                    </p>
                  </div>
                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset sm:inline-flex ${
                      statusStyle[client.status]
                    }`}
                  >
                    {client.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-bold">No clients yet</p>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

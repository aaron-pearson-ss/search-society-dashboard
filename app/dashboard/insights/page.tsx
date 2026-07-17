import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icons } from "@/components/ui/icons";
import {
  createTaskFromInsight,
  generateClientInsights,
  setInsightStatus,
} from "./actions";

const severityStyle: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
  opportunity: "bg-lime-50 text-lime-800",
  info: "bg-blue-50 text-blue-700",
};

const priorityStyle: Record<string, string> = {
  high: "bg-[#181818] text-white",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

function formatDate(value: string | null) {
  if (!value) return "Not analysed yet";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function InsightsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: insights }] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,insights_last_analyzed_at,insights_last_result_count")
      .in("status", ["active", "onboarding"])
      .order("name"),
    supabase
      .from("client_insights")
      .select(
        "id,title,summary,recommendation,severity,priority,impact_score,status,generated_at,client:clients(id,name),task:tasks(id,title,status,due_date)"
      )
      .neq("status", "dismissed")
      .order("impact_score", { ascending: false })
      .order("generated_at", { ascending: false }),
  ]);

  const highPriorityCount =
    insights?.filter((insight: any) => insight.priority === "high").length ?? 0;

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold">Performance intelligence</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Insights &amp; alerts
          </h1>
          <p className="mt-2 text-slate-500">
            Prioritise findings, turn them into tracked work and keep every
            action connected to its source.
          </p>
        </div>

        <div className="rounded-2xl bg-[#181818] px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-lime-300">
            High priority
          </p>
          <p className="mt-1 text-3xl font-bold">{highPriorityCount}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients?.map((client) => (
          <article key={client.id} className="app-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="font-bold text-slate-900 hover:underline"
                >
                  {client.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  Last analysed: {formatDate(client.insights_last_analyzed_at)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {client.insights_last_result_count ?? 0} current finding(s)
                </p>
              </div>

              <form action={generateClientInsights.bind(null, client.id)}>
                <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50">
                  Generate now
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 space-y-4">
        {insights?.length ? (
          insights.map((insight: any) => {
            const linkedTask = Array.isArray(insight.task)
              ? insight.task[0]
              : insight.task;

            return (
              <article key={insight.id} className="app-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        severityStyle[insight.severity]
                      }`}
                    >
                      {insight.severity}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        priorityStyle[insight.priority] ?? priorityStyle.low
                      }`}
                    >
                      {insight.priority} priority
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">
                        {insight.title}
                      </h2>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">
                        Score {insight.impact_score}/100
                      </span>
                      <Link
                        href={`/dashboard/clients/${insight.client.id}`}
                        className="text-xs font-bold text-slate-400 hover:text-slate-900"
                      >
                        {insight.client.name}
                      </Link>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {insight.summary}
                    </p>

                    <p className="mt-3 rounded-xl bg-[#f4f1e9] p-3 text-sm text-slate-700">
                      <strong>Recommended action:</strong>{" "}
                      {insight.recommendation}
                    </p>

                    {linkedTask ? (
                      <Link
                        href="/dashboard/tasks"
                        className="mt-3 flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                      >
                        <Icons.check className="h-4 w-4" />
                        Task created · {linkedTask.status.replace("_", " ")}
                      </Link>
                    ) : null}

                    <p className="mt-2 text-xs text-slate-400">
                      Generated {formatDate(insight.generated_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {linkedTask ? (
                      <Link
                        href="/dashboard/tasks"
                        className="rounded-xl bg-[#181818] px-3 py-2 text-xs font-bold text-white"
                      >
                        View task
                      </Link>
                    ) : (
                      <form action={createTaskFromInsight.bind(null, insight.id)}>
                        <button className="rounded-xl bg-[#181818] px-3 py-2 text-xs font-bold text-white">
                          Create task
                        </button>
                      </form>
                    )}

                    {insight.status !== "reviewed" && !linkedTask ? (
                      <form
                        action={setInsightStatus.bind(
                          null,
                          insight.id,
                          "reviewed"
                        )}
                      >
                        <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">
                          Reviewed
                        </button>
                      </form>
                    ) : null}

                    <form
                      action={setInsightStatus.bind(
                        null,
                        insight.id,
                        "dismissed"
                      )}
                    >
                      <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="app-card p-12 text-center">
            <Icons.warning className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-bold">No active insights yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Generate insights for a client above or wait for the next Monday
              refresh.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

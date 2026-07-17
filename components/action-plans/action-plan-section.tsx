const stageStyle: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  complete: "bg-emerald-50 text-emerald-700",
};

export type ActionPlanItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  completed_at?: string | null;
  completion_note?: string | null;
  roadmap_stage: string;
  roadmap_order?: number | null;
  owner_display_name?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "No deadline";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ActionPlanSection({
  items,
  title = "Action plan",
  description = "The priorities, owners and milestones currently guiding delivery.",
}: {
  items: ActionPlanItem[];
  title?: string;
  description?: string;
}) {
  if (!items.length) return null;

  const completed = items.filter(
    (item) => item.roadmap_stage === "complete"
  ).length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">
            Delivery roadmap
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#181818]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className="min-w-40">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-lime-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                      stageStyle[item.roadmap_stage] ?? stageStyle.planned
                    }`}
                  >
                    {item.roadmap_stage.replace("_", " ")}
                  </span>
                  <span className="text-xs font-bold capitalize text-slate-400">
                    {item.priority} priority
                  </span>
                </div>

                <h3 className="mt-3 font-bold text-slate-900">{item.title}</h3>

                {item.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                ) : null}

                {item.completion_note &&
                item.roadmap_stage === "complete" ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    <strong>Outcome:</strong> {item.completion_note}
                  </p>
                ) : null}
              </div>

              <dl className="shrink-0 space-y-2 text-sm sm:text-right">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Owner
                  </dt>
                  <dd className="mt-1 font-bold text-slate-700">
                    {item.owner_display_name || "Search Society team"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Target
                  </dt>
                  <dd className="mt-1 font-bold text-slate-700">
                    {formatDate(item.due_date)}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

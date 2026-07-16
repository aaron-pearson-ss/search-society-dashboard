import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createReport } from "@/app/dashboard/reports/actions";

function iso(date: Date) { return date.toISOString().slice(0, 10); }

export default async function NewReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", id).single();
  if (!client) notFound();
  const end = new Date(); end.setDate(end.getDate() - 3);
  const start = new Date(end); start.setDate(start.getDate() - 27);
  const previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - 27);
  const month = end.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return <div className="mx-auto max-w-4xl">
    <Link href={`/dashboard/clients/${id}`} className="text-sm font-bold text-slate-500 hover:text-black">← Back to {client.name}</Link>
    <div className="mt-5"><p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-600">Client reporting</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-[#181818]">Create monthly report</h1><p className="mt-2 text-slate-500">Save a branded report period, add commentary, then publish a client-safe link.</p></div>
    {query.error ? <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">The report could not be created. Confirm migration 0005 has been run.</div> : null}
    <form action={createReport.bind(null, id)} className="app-card mt-8 space-y-6 p-6 sm:p-8">
      <label className="block"><span className="text-sm font-bold text-slate-800">Report title</span><input name="title" defaultValue={`${client.name} SEO report — ${month}`} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" required /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-bold text-slate-800">Reporting from</span><input type="date" name="date_from" defaultValue={iso(start)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" required /></label><label><span className="text-sm font-bold text-slate-800">Reporting to</span><input type="date" name="date_to" defaultValue={iso(end)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" required /></label><label><span className="text-sm font-bold text-slate-800">Compare from</span><input type="date" name="comparison_date_from" defaultValue={iso(previousStart)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" required /></label><label><span className="text-sm font-bold text-slate-800">Compare to</span><input type="date" name="comparison_date_to" defaultValue={iso(previousEnd)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" required /></label></div>
      <label className="block"><span className="text-sm font-bold text-slate-800">Executive summary</span><textarea name="executive_summary" rows={5} placeholder="Summarise performance, context and the most important takeaway for the client." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
      <label className="block"><span className="text-sm font-bold text-slate-800">Work completed</span><textarea name="work_completed" rows={4} placeholder="Outline the SEO work delivered during this period." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
      <label className="block"><span className="text-sm font-bold text-slate-800">Next steps</span><textarea name="next_steps" rows={4} placeholder="Set out priorities for the next reporting period." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
      <button className="btn-primary" type="submit">Create report</button>
    </form>
  </div>;
}

import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  onboarding: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/20",
  churned: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const staleBefore = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: clientCount }, { data: recentClients }, { data: properties }, { count: failedSyncs }] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clients").select("id,name,domain,status,monthly_fee,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("gsc_properties").select("id,last_synced_at,client_id").not("client_id", "is", null),
    supabase.from("gsc_sync_runs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("started_at", staleBefore),
  ]);

  const connectedCount = properties?.length ?? 0;
  const staleCount = (properties ?? []).filter((property) => !property.last_synced_at || property.last_synced_at < staleBefore).length;

  const cards = [
    { label: "Active clients", value: String(clientCount ?? 0), note: "Current portfolio", icon: Icons.users },
    { label: "GSC connections", value: String(connectedCount), note: "Linked client properties", icon: Icons.globe },
    { label: "Weekly sync due", value: String(staleCount), note: "Not updated in 8 days", icon: Icons.tasks },
    { label: "Sync failures", value: String(failedSyncs ?? 0), note: "During the last 8 days", icon: Icons.warning },
  ];

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold text-[#181818]">Workspace overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">Good morning</h1><p className="mt-2 text-slate-500">Here’s what’s happening across Search Society today.</p></div>
        <Link href="/dashboard/clients/new" className="btn-primary"><Icons.plus className="h-4 w-4"/>Add client</Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="app-card p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-[#181818]">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-50 text-[#181818]"><Icon className="h-5 w-5"/></span></div><p className="mt-3 text-xs text-slate-400">{note}</p></article>)}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <article className="app-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="font-bold text-slate-900">Recent clients</h2><p className="mt-0.5 text-sm text-slate-500">Your latest account activity</p></div><Link href="/dashboard/clients" className="text-sm font-bold text-[#181818] hover:text-[#181818]">View all</Link></div>
          {recentClients?.length ? <div className="divide-y divide-slate-100">{recentClients.map((client) => <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#f4f1e9] sm:px-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{client.name.slice(0,2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{client.name}</p><p className="truncate text-sm text-slate-500">{client.domain}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset sm:inline-flex ${statusStyle[client.status]}`}>{client.status}</span><div className="hidden min-w-24 text-right md:block"><p className="text-sm font-bold text-slate-800">£{Number(client.monthly_fee ?? 0).toLocaleString()}</p><p className="text-xs text-slate-400">per month</p></div><Icons.arrow className="h-4 w-4 text-slate-400"/></Link>)}</div> : <div className="px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-50 text-[#181818]"><Icons.clients className="h-7 w-7"/></span><h3 className="mt-4 font-bold text-slate-900">Add your first client</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Create a client account now. Search Console data will be connected in the next milestone.</p><Link href="/dashboard/clients/new" className="btn-primary mt-5"><Icons.plus className="h-4 w-4"/>Add client</Link></div>}
        </article>

        <article className="app-card p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#181818] text-white"><Icons.globe className="h-5 w-5"/></span><div><h2 className="font-bold text-slate-900">Search Console</h2><p className="text-sm text-slate-500">Weekly automation</p></div></div>
          <div className="mt-6 rounded-2xl bg-[#181818] p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-lime-300">Every Monday</p><h3 className="mt-2 text-xl font-bold">Client performance refreshes automatically.</h3><p className="mt-3 text-sm leading-6 text-slate-300">The scheduler imports daily totals, queries and landing pages each Monday at 06:00 UTC.</p></div>
          <div className="mt-5 space-y-3">{["Secure Google OAuth", "90-day performance refresh", "Weekly automated sync"].map(item => <div key={item} className="flex items-center gap-3 text-sm text-slate-600"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icons.check className="h-3.5 w-3.5"/></span>{item}</div>)}</div>
        </article>
      </section>
    </>
  );
}

import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  onboarding: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/20",
  churned: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase.from("clients").select("id,name,domain,status,monthly_fee,start_date").order("name");
  if (error) throw new Error(error.message);
  const monthlyRevenue = clients?.filter(c => c.status === "active").reduce((sum, c) => sum + Number(c.monthly_fee ?? 0), 0) ?? 0;

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-[#181818]">Client management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">Clients</h1><p className="mt-2 text-slate-500">Manage accounts, retainers and reporting connections.</p></div><Link className="btn-primary" href="/dashboard/clients/new"><Icons.plus className="h-4 w-4"/>Add client</Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="app-card p-5"><p className="text-sm font-semibold text-slate-500">Total clients</p><p className="mt-2 text-2xl font-bold text-[#181818]">{clients?.length ?? 0}</p></div><div className="app-card p-5"><p className="text-sm font-semibold text-slate-500">Active retainers</p><p className="mt-2 text-2xl font-bold text-[#181818]">{clients?.filter(c => c.status === "active").length ?? 0}</p></div><div className="app-card p-5"><p className="text-sm font-semibold text-slate-500">Monthly revenue</p><p className="mt-2 text-2xl font-bold text-[#181818]">£{monthlyRevenue.toLocaleString()}</p></div></div>
      <div className="app-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="font-bold text-slate-900">All client accounts</h2><p className="mt-0.5 text-sm text-slate-500">{clients?.length ?? 0} records in this workspace</p></div><div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400 sm:flex"><Icons.search className="h-4 w-4"/>Search coming soon</div></div>
        {clients?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f4f1e9]/70 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3.5 font-bold">Client</th><th className="px-6 py-3.5 font-bold">Status</th><th className="px-6 py-3.5 font-bold">Start date</th><th className="px-6 py-3.5 text-right font-bold">Monthly fee</th><th className="w-12"/></tr></thead><tbody className="divide-y divide-slate-100">{clients.map((client) => <tr key={client.id} className="transition hover:bg-[#f4f1e9]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-50 font-bold text-[#181818]">{client.name.slice(0,2).toUpperCase()}</span><div><Link className="font-bold text-slate-900 hover:text-[#181818]" href={`/dashboard/clients/${client.id}`}>{client.name}</Link><p className="mt-0.5 text-slate-500">{client.domain}</p></div></div></td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle[client.status]}`}>{client.status}</span></td><td className="px-6 py-4 text-slate-600">{client.start_date ? new Date(`${client.start_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td><td className="px-6 py-4 text-right font-bold text-slate-900">£{Number(client.monthly_fee ?? 0).toLocaleString()}</td><td className="pr-6"><Link href={`/dashboard/clients/${client.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-[#181818]"><Icons.arrow className="h-4 w-4"/></Link></td></tr>)}</tbody></table></div> : <div className="px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-50 text-[#181818]"><Icons.clients className="h-7 w-7"/></span><h3 className="mt-4 font-bold text-slate-900">No clients yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Add your first client to begin building your agency workspace.</p><Link href="/dashboard/clients/new" className="btn-primary mt-5"><Icons.plus className="h-4 w-4"/>Add client</Link></div>}
      </div>
    </>
  );
}

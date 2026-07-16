import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#181818]"><span className="rotate-180"><Icons.arrow className="h-4 w-4"/></span>Back to clients</Link>
      <div className="mt-5"><p className="text-sm font-bold text-[#181818]">New account</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">Add a client</h1><p className="mt-2 text-slate-500">Create the core account record. You’ll connect reporting data afterwards.</p></div>
      <form action={createClientRecord} className="app-card mt-8 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8"><h2 className="font-bold text-slate-900">Client details</h2><p className="mt-1 text-sm text-slate-500">The information your team will use across the workspace.</p></div>
        <div className="space-y-6 p-6 sm:p-8">
          <div><label htmlFor="name" className="text-sm font-semibold text-slate-700">Client name</label><input id="name" required name="name" placeholder="Acme Ltd" className="form-input" /></div>
          <div><label htmlFor="domain" className="text-sm font-semibold text-slate-700">Website domain</label><div className="relative"><Icons.globe className="absolute left-3.5 top-[18px] h-4 w-4 text-slate-400"/><input id="domain" required name="domain" placeholder="example.com" className="form-input pl-10" /></div><p className="mt-2 text-xs text-slate-400">Enter the domain without https:// or a trailing slash.</p></div>
          <div className="grid gap-6 sm:grid-cols-2"><div><label htmlFor="status" className="text-sm font-semibold text-slate-700">Status</label><select id="status" name="status" className="form-input"><option value="active">Active</option><option value="onboarding">Onboarding</option><option value="paused">Paused</option><option value="churned">Churned</option></select></div><div><label htmlFor="monthly_fee" className="text-sm font-semibold text-slate-700">Monthly fee</label><div className="relative"><span className="absolute left-3.5 top-[15px] text-sm font-semibold text-slate-400">£</span><input id="monthly_fee" name="monthly_fee" type="number" min="0" step="0.01" placeholder="0.00" className="form-input pl-8" /></div></div></div>
          <div><label htmlFor="start_date" className="text-sm font-semibold text-slate-700">Start date</label><input id="start_date" name="start_date" type="date" className="form-input sm:max-w-xs" /></div>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-[#f4f1e9]/70 px-6 py-4 sm:flex-row sm:justify-end sm:px-8"><Link href="/dashboard/clients" className="btn-secondary">Cancel</Link><button className="btn-primary">Create client <Icons.arrow className="h-4 w-4"/></button></div>
      </form>
    </div>
  );
}

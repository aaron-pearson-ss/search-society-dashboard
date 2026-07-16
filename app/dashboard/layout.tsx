import Link from "next/link";
import Image from "next/image";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { Icons } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organisation_members").select("role, organisations(name)").limit(1).maybeSingle();
  const org = Array.isArray(membership?.organisations) ? membership.organisations[0] : membership?.organisations;
  const agencyName = org?.name ?? "My Agency";
  const initial = (user?.email?.[0] ?? "A").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f1e9] lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-[#181818] px-4 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/dashboard" className="block px-2"><Image src="/search-society-logo.png" alt="Search Society" width={960} height={192} className="h-8 w-auto brightness-0 invert" priority /><p className="mt-2 max-w-[180px] truncate text-xs text-slate-400">{agencyName}</p></Link>
        <div className="mt-8"><DashboardNav /></div>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-500 text-sm font-bold">{initial}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.email?.split("@")[0]}</p><p className="truncate text-xs capitalize text-slate-400">{membership?.role ?? "Member"}</p></div></div>
          <form action={signOut}><button className="mt-3 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"><Icons.logout className="h-4 w-4"/>Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-8">
          <div className="lg:hidden"><Image src="/search-society-logo.png" alt="Search Society" width={960} height={192} className="h-7 w-auto" priority /></div>
          <div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex"><span className="h-2 w-2 rounded-full bg-lime-500"/><span>Workspace online</span></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.email}</p><p className="text-xs text-slate-400">{agencyName}</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{initial}</span></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  );
}

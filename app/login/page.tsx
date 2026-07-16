import Image from "next/image";
import { Icons } from "@/components/ui/icons";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen bg-[#181818] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 top-28 h-80 w-80 rounded-full bg-lime-300 blur-[120px] opacity-20" />
        <div className="relative">
          <Image src="/search-society-logo.png" alt="Search Society" width={960} height={192} className="h-12 w-auto brightness-0 invert" priority />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[.22em] text-lime-300">Powered by data</p>
          <h1 className="text-5xl font-bold leading-[1.06] tracking-tight">Organic search performance, clients and delivery in one place.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">A focused workspace for Search Society to surface opportunities, track progress and keep every client moving forward.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {["Client overview", "GSC performance", "Agency workflows"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold backdrop-blur"><Icons.check className="mb-3 h-5 w-5 text-lime-300"/>{item}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">Search Society · No-nonsense organic search.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f4f1e9] px-6 py-12">
        <div className="w-full max-w-md">
          <Image src="/search-society-logo.png" alt="Search Society" width={960} height={192} className="mb-9 h-10 w-auto lg:hidden" priority />
          <div className="app-card p-7 sm:p-9">
            <div className="mb-7 h-1.5 w-16 rounded-full bg-lime-300" />
            <p className="brand-kicker text-sm font-bold">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#181818]">Sign in to your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Manage Search Society’s clients and organic performance.</p>
            {error ? <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"><Icons.warning className="mt-0.5 h-5 w-5 shrink-0"/><span>{error}</span></div> : null}
            <form action={signIn} className="mt-7">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@searchsociety.co.uk" className="form-input" />
              <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" className="form-input" />
              <button className="btn-primary mt-7 w-full py-3">Sign in <Icons.arrow className="h-4 w-4"/></button>
            </form>
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">Securely powered by Supabase authentication.</p>
        </div>
      </section>
    </main>
  );
}

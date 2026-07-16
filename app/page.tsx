import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#181818]">Search Society</p>
        <h1 className="text-5xl font-bold tracking-tight">One home for clients, delivery and organic performance.</h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">Manage client records today, then connect Search Console reporting and automated insights without rebuilding the foundation.</p>
        <div className="mt-8 flex gap-3">
          <Link className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white" href="/login">Sign in</Link>
          <Link className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold" href="/dashboard">View dashboard</Link>
        </div>
      </section>
    </main>
  );
}

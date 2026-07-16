"use client";

export function PrintReportButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#181818] px-4 py-2.5 text-sm font-bold text-white hover:bg-black">Print / save PDF</button>;
}

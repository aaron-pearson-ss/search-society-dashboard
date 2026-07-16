import { notFound } from "next/navigation";
import { ReportDocument } from "@/components/reports/report-document";
import { PrintReportButton } from "@/components/reports/report-view";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const supabase = createAdminClient();
  const { data: report } = await supabase.from("client_reports").select("*, clients(name, domain)").eq("public_token", token).eq("status", "published").single();
  if (!report) notFound(); const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
  const { data: currentRows } = await supabase.from("gsc_daily_metrics").select("metric_date, clicks, impressions, position").eq("client_id", report.client_id).gte("metric_date", report.date_from).lte("metric_date", report.date_to).order("metric_date");
  const { data: previousRows } = await supabase.from("gsc_daily_metrics").select("metric_date, clicks, impressions, position").eq("client_id", report.client_id).gte("metric_date", report.comparison_date_from).lte("metric_date", report.comparison_date_to).order("metric_date");
  const { data: dimensions } = await supabase.from("gsc_dimension_metrics").select("dimension_type, dimension_value, clicks, impressions, ctr, position").eq("client_id", report.client_id).eq("period_key", "current").order("clicks", { ascending: false }).limit(40);
  const top = (type: string) => (dimensions ?? []).filter((row) => row.dimension_type === type).slice(0, 10).map((row) => ({ ...row, clicks: Number(row.clicks), impressions: Number(row.impressions), ctr: Number(row.ctr), position: Number(row.position) }));
  return <main className="min-h-screen bg-[#f4f1e9] px-4 py-6 sm:px-8"><div className="no-print mx-auto mb-4 flex max-w-6xl justify-end"><PrintReportButton /></div><ReportDocument report={report} client={client} currentRows={(currentRows ?? []).map((r) => ({ ...r, clicks: Number(r.clicks), impressions: Number(r.impressions), position: Number(r.position) }))} previousRows={(previousRows ?? []).map((r) => ({ ...r, clicks: Number(r.clicks), impressions: Number(r.impressions), position: Number(r.position) }))} topQueries={top("query")} topPages={top("page")} /></main>;
}

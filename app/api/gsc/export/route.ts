import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
  const type = request.nextUrl.searchParams.get("type") === "page" ? "page" : "query";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: client } = await supabase.from("clients").select("name").eq("id", clientId).single();
  if (!client) return new NextResponse("Client not found", { status: 404 });

  const { data, error } = await supabase
    .from("gsc_dimension_metrics")
    .select("dimension_value,clicks,impressions,ctr,position,date_from,date_to")
    .eq("client_id", clientId)
    .eq("dimension_type", type)
    .eq("period_key", "current")
    .order("clicks", { ascending: false })
    .limit(5000);
  if (error) return new NextResponse(error.message, { status: 500 });

  const header = [type === "query" ? "Query" : "Landing page", "Clicks", "Impressions", "CTR", "Average position", "Date from", "Date to"];
  const rows = (data ?? []).map((row) => [row.dimension_value, row.clicks, row.impressions, row.ctr, row.position, row.date_from, row.date_to]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const filename = `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${type === "query" ? "queries" : "landing-pages"}.csv`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
}

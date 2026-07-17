import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/google/crypto";
import { verifyOAuthState } from "@/lib/google/oauth-state";
import { fetchGa4Properties } from "@/lib/google/analytics";

type TokenResponse = { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string; id_token?: string; error?: string };
type SiteEntry = { siteUrl: string; permissionLevel?: string };

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (!stateRaw) return NextResponse.redirect(new URL("/dashboard/clients?gsc=invalid-state", request.url));

  let state;
  try { state = verifyOAuthState(stateRaw); }
  catch { return NextResponse.redirect(new URL("/dashboard/clients?gsc=invalid-state", request.url)); }

  const returnUrl = new URL(`/dashboard/clients/${state.clientId}`, request.url);
  if (oauthError || !code) { returnUrl.searchParams.set("gsc", oauthError ?? "missing-code"); return NextResponse.redirect(returnUrl); }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== state.userId) return NextResponse.redirect(new URL("/login", request.url));

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const tokens = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
    returnUrl.searchParams.set("gsc", tokens.error ?? "token-exchange-failed");
    return NextResponse.redirect(returnUrl);
  }

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  const userInfo = userInfoResponse.ok ? await userInfoResponse.json() as { email?: string } : {};

  const { data: connection, error: connectionError } = await supabase.from("google_connections").upsert({
    organisation_id: state.organisationId,
    user_id: user.id,
    google_email: userInfo.email ?? null,
    encrypted_refresh_token: encryptToken(tokens.refresh_token),
    access_token: tokens.access_token,
    access_token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    scopes: tokens.scope?.split(" ") ?? [],
    updated_at: new Date().toISOString(),
  }, { onConflict: "organisation_id,user_id" }).select("id").single();

  if (connectionError || !connection) {
    returnUrl.searchParams.set("gsc", "connection-save-failed");
    return NextResponse.redirect(returnUrl);
  }

  const sitesResponse = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
  const sitesPayload = sitesResponse.ok ? await sitesResponse.json() as { siteEntry?: SiteEntry[] } : {};
  const rows = (sitesPayload.siteEntry ?? []).map((site) => ({
    organisation_id: state.organisationId,
    google_connection_id: connection.id,
    site_url: site.siteUrl,
    permission_level: site.permissionLevel ?? null,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) await supabase.from("gsc_properties").upsert(rows, { onConflict: "organisation_id,site_url" });

  try {
    const ga4Properties = await fetchGa4Properties(tokens.access_token);
    const ga4Rows = ga4Properties.filter((item) => item.property && item.displayName).map((item) => ({
      organisation_id: state.organisationId, google_connection_id: connection.id,
      property_id: item.property!.replace("properties/", ""), display_name: item.displayName!, updated_at: new Date().toISOString(),
    }));
    if (ga4Rows.length) await supabase.from("ga4_properties").upsert(ga4Rows, { onConflict: "organisation_id,property_id" });
  } catch { /* GSC can still connect if Analytics access is unavailable. */ }

  returnUrl.searchParams.set("gsc", "connected");
  return NextResponse.redirect(returnUrl);
}

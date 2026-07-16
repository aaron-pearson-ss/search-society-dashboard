import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuthState } from "@/lib/google/oauth-state";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.redirect(new URL("/dashboard/clients?error=missing-client", request.url));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: client } = await supabase.from("clients").select("id, organisation_id").eq("id", clientId).single();
  if (!client) return NextResponse.redirect(new URL("/dashboard/clients?error=client-not-found", request.url));

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!googleClientId || !redirectUri) return NextResponse.redirect(new URL(`/dashboard/clients/${clientId}?gsc=missing-env`, request.url));

  const state = createOAuthState({ clientId, organisationId: client.organisation_id, userId: user.id });
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

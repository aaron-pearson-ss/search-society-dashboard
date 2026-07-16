import { decryptToken } from "@/lib/google/crypto";
import { createClient } from "@/lib/supabase/server";

type GoogleConnection = {
  id: string;
  encrypted_refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
};

type RefreshPayload = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function getGoogleAccessToken(connection: GoogleConnection, databaseClient?: any): Promise<string> {
  const expiry = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;

  if (connection.access_token && expiry > Date.now() + 60_000) {
    return connection.access_token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: decryptToken(connection.encrypted_refresh_token),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as RefreshPayload;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token refresh failed");
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString();
  const supabase = databaseClient ?? await createClient();
  const { error } = await supabase
    .from("google_connections")
    .update({
      access_token: payload.access_token,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (error) throw new Error(`Could not save refreshed Google token: ${error.message}`);
  return payload.access_token;
}

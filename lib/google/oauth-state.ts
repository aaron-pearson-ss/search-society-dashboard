import crypto from "node:crypto";

type OAuthState = { clientId: string; organisationId: string; userId: string; nonce: string };

function secret() {
  const value = process.env.GSC_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("GSC_TOKEN_ENCRYPTION_KEY is missing");
  return value;
}

export function createOAuthState(payload: Omit<OAuthState, "nonce">): string {
  const body = Buffer.from(JSON.stringify({ ...payload, nonce: crypto.randomBytes(16).toString("hex") })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyOAuthState(value: string): OAuthState {
  const [body, signature] = value.split(".");
  if (!body || !signature) throw new Error("Invalid OAuth state");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) throw new Error("Invalid OAuth state signature");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
}

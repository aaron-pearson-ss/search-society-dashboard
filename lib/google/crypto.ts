import crypto from "node:crypto";

function key(): Buffer {
  const raw = process.env.GSC_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GSC_TOKEN_ENCRYPTION_KEY is missing");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("GSC_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return decoded;
}

export function encryptToken(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted token");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

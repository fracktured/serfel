import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual throws on length mismatch; guard first (length is not secret).
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyBasicAuth(
  authHeader: string | undefined,
  expected: { username: string; password: string }
): boolean {
  if (!authHeader) return false;
  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const username = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return safeEqual(username, expected.username) && safeEqual(password, expected.password);
}

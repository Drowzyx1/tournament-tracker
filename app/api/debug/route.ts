import { NextResponse } from "next/server";

// One-way fingerprint (not reversible) so we can compare whether two
// runtimes see the *same* secret value without ever exposing the secret
// itself, even partially. Uses Web Crypto, available in both Edge and Node.
async function fingerprint(value: string): Promise<string> {
  if (!value) return "empty";
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

// TEMPORARY — compares what the Node.js runtime sees for NEXTAUTH_SECRET
// against what the Edge middleware reports (via /dashboard?__debug=1), to
// root-cause a redirect loop where the two runtimes disagree about whether
// a session cookie is valid. Delete once root-caused.
export async function GET() {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  return NextResponse.json({
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    secretLength: secret.length,
    secretFingerprint: await fingerprint(secret),
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
  });
}

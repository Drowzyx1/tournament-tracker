import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

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

// TEMPORARY DIAGNOSTIC VERSION — replaces withAuth() with an equivalent
// hand-rolled check that logs *presence* (never values) of the secret,
// which cookies arrived, and whether getToken() could verify them. This is
// to root-cause a redirect loop between "/" and "/dashboard" where the Node
// server (getServerSession) and this Edge middleware disagree about the
// same session cookie. Revert to withAuth() once root-caused.
export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  const secretLength = secret.length;
  const secretFingerprint = await fingerprint(secret);
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? null;

  let token = null;
  let tokenError: string | null = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (e) {
    tokenError = e instanceof Error ? e.message : String(e);
  }

  let tokenForcedSecure = null;
  let tokenForcedSecureError: string | null = null;
  try {
    tokenForcedSecure = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: true,
      cookieName: "__Secure-next-auth.session-token",
    });
  } catch (e) {
    tokenForcedSecureError = e instanceof Error ? e.message : String(e);
  }

  const debugInfo = {
    hasSecret,
    secretLength,
    secretFingerprint,
    nextAuthUrl,
    vercelEnv: process.env.VERCEL ?? null,
    cookieNames,
    hasToken: !!token,
    tokenSub: token?.sub ?? null,
    tokenError,
    hasTokenForcedSecure: !!tokenForcedSecure,
    tokenForcedSecureSub: tokenForcedSecure?.sub ?? null,
    tokenForcedSecureError,
    url: req.nextUrl.pathname,
  };

  // TEMPORARY: return the diagnostic payload directly in the response body
  // (instead of only console.log, which wasn't showing up in Vercel's log
  // viewer for Edge Middleware) so it can be read straight from `curl`.
  if (req.nextUrl.searchParams.has("__debug")) {
    return NextResponse.json(debugInfo);
  }

  if (!token) {
    const url = new URL("/", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

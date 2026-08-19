import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Hand-rolled instead of next-auth/middleware's withAuth(): its automatic
// secure-cookie detection inside getToken() doesn't reliably resolve in
// Vercel's Edge Middleware runtime — confirmed by diagnostic (identical
// secret, identical cookie: getServerSession() in Node decrypts it fine,
// but getToken()'s default auto-detection here returned null even though
// process.env.VERCEL was present). Deriving `secureCookie` from the actual
// request protocol sidesteps that broken auto-detection entirely, and works
// correctly both locally (http, unprefixed cookie) and on Vercel (https,
// __Secure- prefixed cookie).
export default async function middleware(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === "https:";
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });

  if (!token) {
    const url = new URL("/", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Only page routes are protected here. API routes check the session
// themselves (see app/api/**) so they can return a clean 401 JSON response
// instead of an HTML redirect when called via fetch().
export const config = {
  matcher: ["/dashboard/:path*"],
};

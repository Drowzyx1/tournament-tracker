import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// TEMPORARY DIAGNOSTIC VERSION — replaces withAuth() with an equivalent
// hand-rolled check that logs *presence* (never values) of the secret,
// which cookies arrived, and whether getToken() could verify them. This is
// to root-cause a redirect loop between "/" and "/dashboard" where the Node
// server (getServerSession) and this Edge middleware disagree about the
// same session cookie. Revert to withAuth() once root-caused.
export async function middleware(req: NextRequest) {
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  const secretLength = process.env.NEXTAUTH_SECRET?.length ?? 0;
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? null;

  let token = null;
  let tokenError: string | null = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (e) {
    tokenError = e instanceof Error ? e.message : String(e);
  }

  console.log(
    "[mw-debug]",
    JSON.stringify({
      hasSecret,
      secretLength,
      nextAuthUrl,
      cookieNames,
      hasToken: !!token,
      tokenSub: token?.sub ?? null,
      tokenError,
      url: req.nextUrl.pathname,
    })
  );

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

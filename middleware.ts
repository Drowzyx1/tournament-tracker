import { withAuth } from "next-auth/middleware";

// Redirect unauthenticated visitors to our own sign-in page ("/") instead of
// NextAuth's default built-in page.
//
// `secret` is passed explicitly (matching lib/auth.ts) because relying on
// next-auth's implicit NEXTAUTH_SECRET env lookup here vs. in
// getServerSession() resolved inconsistently on Vercel, causing this Edge
// middleware to reject session cookies that the Node server considered
// valid — an infinite redirect loop between "/" and "/dashboard".
export default withAuth({
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Only page routes are protected here. API routes check the session
// themselves (see app/api/**) so they can return a clean 401 JSON response
// instead of an HTML redirect when called via fetch().
export const config = {
  matcher: ["/dashboard/:path*"],
};

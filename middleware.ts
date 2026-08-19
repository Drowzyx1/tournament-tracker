import { withAuth } from "next-auth/middleware";

// Redirect unauthenticated visitors to our own sign-in page ("/") instead of
// NextAuth's default built-in page.
export default withAuth({
  pages: {
    signIn: "/",
  },
});

// Only page routes are protected here. API routes check the session
// themselves (see app/api/**) so they can return a clean 401 JSON response
// instead of an HTML redirect when called via fetch().
export const config = {
  matcher: ["/dashboard/:path*"],
};

import type { DefaultSession } from "next-auth";

// Extends the built-in session/user types so `session.user.id` is typed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
  }
}

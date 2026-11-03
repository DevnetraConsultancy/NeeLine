import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe part of the auth setup (no database), shared by the middleware
 * and the full configuration in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.isGuest = token.isGuest === true;
      }
      return session;
    },
  },
};

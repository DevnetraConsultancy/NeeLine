import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/",
  },
  providers: [], // Providers aren't needed here — this config is only used
                  // by middleware to check session validity, not to log people in.
  callbacks: {
    session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).isGuest = token.isGuest as boolean;
      }
      return session;
    },
  },
};

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Guest",
      credentials: {
        guest: { label: "Guest", type: "text" },
      },
      async authorize() {
        // Create a lightweight guest user — no email required
        const guestId = crypto.randomUUID().slice(0, 8);
        const user = await prisma.user.create({
          data: {
            name: "Guest",
            email: `guest-${guestId}@chronoscope.local`,
          },
        });
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  // JWT strategy avoids DB reads in Edge Runtime middleware
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, persist user id and guest flag into the JWT
      if (user) {
        token.id = user.id;
        token.isGuest = user.email?.endsWith("@chronoscope.local") ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).isGuest = token.isGuest as boolean;
      }
      return session;
    },
  },
});

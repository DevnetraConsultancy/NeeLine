import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { isGoogleConfigured } from "@/lib/env";
import { consume, hashedClientIp, RATE_RULES } from "@/lib/server/rate-limit";

export const GUEST_RETENTION_DAYS = 30;
const GUEST_CLEANUP_BATCH = 50;

class GuestRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Deletes a small batch of guest accounts that have been inactive for longer
 * than the retention period (their timelines and events cascade). Runs on
 * guest sign-in so no scheduled job is needed.
 */
async function deleteExpiredGuests(): Promise<void> {
  const cutoff = new Date(Date.now() - GUEST_RETENTION_DAYS * 86_400_000);
  const expired = await prisma.user.findMany({
    where: { isGuest: true, lastActiveAt: { lt: cutoff } },
    select: { id: true },
    take: GUEST_CLEANUP_BATCH,
  });
  if (expired.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: expired.map((u) => u.id) }, isGuest: true } });
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(isGoogleConfigured()
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize(_credentials, request) {
        if (!(await consume(RATE_RULES.guestSignIn, hashedClientIp(request.headers)))) {
          throw new GuestRateLimited();
        }
        await deleteExpiredGuests().catch((error: unknown) => console.error("Guest cleanup failed:", error));
        const user = await prisma.user.create({
          data: { name: "Guest", email: `guest-${crypto.randomUUID()}@guest.neeline.invalid`, isGuest: true },
        });
        return { id: user.id, name: user.name, email: user.email, isGuest: true };
      },
    }),
  ],
  // JWT sessions keep the edge middleware free of database reads.
  session: { strategy: "jwt", maxAge: GUEST_RETENTION_DAYS * 86_400 },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isGuest = Boolean(user.isGuest);
      }
      return token;
    },
  },
});

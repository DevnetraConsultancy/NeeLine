import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/server/api";
import { enforce, RATE_RULES } from "@/lib/server/rate-limit";

export interface SessionUser {
  id: string;
  isGuest: boolean;
}

const DAY_MS = 86_400_000;
/** Per-instance memory of the last activity write, so we touch the row at most once a day. */
const lastTouched = new Map<string, number>();

async function touchActivity(userId: string): Promise<void> {
  const now = Date.now();
  if (now - (lastTouched.get(userId) ?? 0) < DAY_MS) return;
  lastTouched.set(userId, now);
  await prisma.user.updateMany({
    where: { id: userId, lastActiveAt: { lt: new Date(now - DAY_MS) } },
    data: { lastActiveAt: new Date(now) },
  });
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "Please sign in to continue.");
  await touchActivity(id);
  return { id, isGuest: Boolean(session.user.isGuest) };
}

/** For handlers that change data: signed in and within the write rate limit. */
export async function requireWriter(): Promise<SessionUser> {
  const user = await requireUser();
  await enforce(RATE_RULES.write, user.id);
  return user;
}

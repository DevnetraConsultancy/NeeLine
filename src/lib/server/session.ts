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
/** How long a confirmed user row is trusted before it is looked up again. */
const CONFIRM_MS = 10 * 60_000;
/** Per-instance memory of when each user row was last confirmed to exist. */
const confirmedAt = new Map<string, number>();

/**
 * Confirms the user row still exists (expired guests are deleted while their
 * session cookie may still be valid) and records activity at most once a day.
 * The lookup is cached for a few minutes per instance.
 */
async function confirmUser(userId: string): Promise<boolean> {
  const now = Date.now();
  if (now - (confirmedAt.get(userId) ?? 0) < CONFIRM_MS) return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastActiveAt: true } });
  if (!user) {
    confirmedAt.delete(userId);
    return false;
  }
  confirmedAt.set(userId, now);
  if (now - user.lastActiveAt.getTime() >= DAY_MS) {
    await prisma.user.updateMany({ where: { id: userId }, data: { lastActiveAt: new Date(now) } });
  }
  return true;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "Please sign in to continue.");
  if (!(await confirmUser(id))) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return { id, isGuest: Boolean(session.user.isGuest) };
}

/** For handlers that change data: signed in and within the write rate limit. */
export async function requireWriter(): Promise<SessionUser> {
  const user = await requireUser();
  await enforce(RATE_RULES.write, user.id);
  return user;
}

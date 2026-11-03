import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { serverEnv } from "@/lib/env";
import { ApiError } from "@/lib/server/api";

export interface RateRule {
  /** Key prefix, e.g. "write". */
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_RULES = {
  guestSignIn: { name: "guest-signin", limit: 20, windowSeconds: 10 * 60 },
  write: { name: "write", limit: 300, windowSeconds: 60 },
  import: { name: "import", limit: 30, windowSeconds: 10 * 60 },
} satisfies Record<string, RateRule>;

/**
 * Fixed-window counter stored in Postgres, so it works across serverless
 * instances without another service. Returns false when over the limit.
 */
export async function consume(rule: RateRule, subject: string): Promise<boolean> {
  const key = `${rule.name}:${subject}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                     THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;

  if (Math.random() < 0.01) {
    await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } });
  }
  return Number(rows[0]?.count ?? 0) <= rule.limit;
}

export async function enforce(rule: RateRule, subject: string): Promise<void> {
  if (!(await consume(rule, subject))) {
    throw new ApiError(429, "You're doing that too often. Please wait a minute and try again.");
  }
}

/** Client IP, hashed so raw addresses are never stored. */
export function hashedClientIp(headers: Headers): string {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${serverEnv().AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
}

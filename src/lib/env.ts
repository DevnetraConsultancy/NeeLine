import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is not set. Copy .env.example to .env and fill it in." })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// or postgresql:// connection string."),
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET is not set. Generate one with: npx auth secret" })
    .min(32, "AUTH_SECRET must be at least 32 characters."),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Validated server environment. Read lazily so `next build` can run without
 * secrets, but the first request that needs them fails loudly with a clear
 * message instead of silently falling back to a default.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}

/** Google sign-in is offered only when both credentials are configured. */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

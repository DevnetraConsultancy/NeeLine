import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";
import { firstIssue } from "@/lib/validation/schemas";

/** An error whose message is safe and useful to show to the user. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "That item") => new ApiError(404, `${what} was not found. It may have been deleted.`);

type RouteContext<P> = { params: Promise<P> };
type Handler<P> = (req: Request, ctx: RouteContext<P>) => Promise<Response>;

/**
 * Wraps a route handler so every failure becomes a JSON `{ error }` response
 * with an appropriate status, and unexpected failures are logged without
 * leaking internals to the client.
 */
export function route<P = Record<string, never>>(handler: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

function errorResponse(error: unknown, req: Request): Response {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: firstIssue(error) }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return json({ error: "That item was not found. It may have been deleted." }, 404);
    if (error.code === "P2002") return json({ error: "That name is already in use here." }, 409);
    if (error.code === "P2003") {
      // A foreign key failed: the layer was deleted under us, or the user row is gone.
      const field = String(error.meta?.field_name ?? "");
      if (field.includes("layerId")) return json({ error: "That layer no longer exists. Reload and try again." }, 409);
      return json({ error: "Your session has expired. Please sign in again." }, 401);
    }
  }
  console.error(`${req.method} ${new URL(req.url).pathname} failed:`, error);
  return json({ error: "Something went wrong on our side. Please try again." }, 500);
}

export function json<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads and validates a JSON body. */
export async function readBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "The request body must be valid JSON.");
  }
  return schema.parse(raw);
}

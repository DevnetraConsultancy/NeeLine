import { prisma } from "@/lib/prisma";
import { json, readBody, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline, touchTimeline } from "@/lib/server/timelines";
import { layerVisibilitySchema } from "@/lib/validation/schemas";

/** POST /api/layers/visibility — body { timelineId, visibleIds }; every other layer is hidden. */
export const POST = route(async (req) => {
  const user = await requireWriter();
  const { timelineId, visibleIds } = await readBody(req, layerVisibilitySchema);
  await ownedTimeline(user.id, timelineId);

  // One statement for the whole timeline. Two separate updates (show these,
  // hide the rest) lock rows in different orders when two saves overlap, which
  // deadlocked in production (P2034).
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Layer"
      SET "visible" = ("id" = ANY(${visibleIds}::text[])), "updatedAt" = now()
      WHERE "timelineId" = ${timelineId}
        AND "visible" IS DISTINCT FROM ("id" = ANY(${visibleIds}::text[]))`;
    await touchTimeline(tx, timelineId);
  });
  return json({ ok: true });
});

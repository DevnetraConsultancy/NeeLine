import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline } from "@/lib/server/timelines";

/** POST /api/timelines/:id/trash — move to the trash (recoverable). */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  await ownedTimeline(user.id, id);
  await prisma.timeline.update({ where: { id }, data: { deletedAt: new Date() } });
  return json({ ok: true });
});

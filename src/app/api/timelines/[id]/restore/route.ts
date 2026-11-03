import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/server/api";
import { requireWriter } from "@/lib/server/session";
import { ownedTimeline } from "@/lib/server/timelines";

/** POST /api/timelines/:id/restore — bring a timeline back from the trash. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireWriter();
  const { id } = await params;
  await ownedTimeline(user.id, id, { allowTrashed: true });
  await prisma.timeline.update({ where: { id }, data: { deletedAt: null } });
  return json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/timelines - List user's timelines
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const showTrash = url.searchParams.get("trash") === "true";

  const timelines = await prisma.timeline.findMany({
    where: {
      userId: session.user.id,
      deletedAt: showTrash ? { not: null } : null,
    },
    include: {
      _count: { select: { events: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(timelines);
}

// POST /api/timelines - Create a new timeline
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name || "Untitled Timeline";

  const timeline = await prisma.timeline.create({
    data: {
      userId: session.user.id,
      name,
      events: {
        create: {
          year: 0,
          isBce: false,
          title: "Year Zero",
          color: "#c9a84c",
        },
      },
    },
    include: { events: true },
  });

  return NextResponse.json(timeline, { status: 201 });
}

// PATCH /api/timelines?id=xxx - Update a timeline (rename, colors, restore)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.timeline.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.deletedAt !== undefined) data.deletedAt = body.deletedAt;
  if (body.bgColor !== undefined) data.bgColor = body.bgColor;
  if (body.spineColor !== undefined) data.spineColor = body.spineColor;
  if (body.tickColor !== undefined) data.tickColor = body.tickColor;
  if (body.textColor !== undefined) data.textColor = body.textColor;

  const updated = await prisma.timeline.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/timelines?id=xxx - Soft delete (move to trash)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const permanent = url.searchParams.get("permanent") === "true";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.timeline.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (permanent) {
    await prisma.timeline.delete({ where: { id } });
  } else {
    await prisma.timeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}

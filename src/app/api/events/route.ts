import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/events?timelineId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const timelineId = url.searchParams.get("timelineId");
  if (!timelineId) {
    return NextResponse.json({ error: "Missing timelineId" }, { status: 400 });
  }

  // Verify ownership
  const timeline = await prisma.timeline.findFirst({
    where: { id: timelineId, userId: session.user.id },
  });
  if (!timeline) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: { timelineId },
    orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
  });

  return NextResponse.json(events);
}

// POST /api/events - Create a new event
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { timelineId, year, isBce, month, day, title, description, color } = body;

  if (!timelineId || year === undefined || !title) {
    return NextResponse.json(
      { error: "Missing required fields: timelineId, year, title" },
      { status: 400 }
    );
  }

  // Verify ownership
  const timeline = await prisma.timeline.findFirst({
    where: { id: timelineId, userId: session.user.id },
  });
  if (!timeline) {
    return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
  }

  const event = await prisma.event.create({
    data: {
      timelineId,
      year: parseInt(year),
      isBce: Boolean(isBce),
      month: month ? parseInt(month) : null,
      day: day ? parseInt(day) : null,
      title,
      description: description || null,
      color: color || "#c9a84c",
    },
  });

  // Touch the timeline's updatedAt
  await prisma.timeline.update({
    where: { id: timelineId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(event, { status: 201 });
}

// PATCH /api/events?id=xxx - Update an event
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

  // Verify ownership through timeline
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const timeline = await prisma.timeline.findFirst({
    where: { id: existing.timelineId, userId: session.user.id },
  });
  if (!timeline) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (body.year !== undefined) data.year = parseInt(body.year);
  if (body.isBce !== undefined) data.isBce = Boolean(body.isBce);
  if (body.month !== undefined) data.month = body.month ? parseInt(body.month) : null;
  if (body.day !== undefined) data.day = body.day ? parseInt(body.day) : null;
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.color !== undefined) data.color = body.color;

  const updated = await prisma.event.update({
    where: { id },
    data,
  });

  // Touch the timeline's updatedAt
  await prisma.timeline.update({
    where: { id: existing.timelineId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(updated);
}

// DELETE /api/events?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const timeline = await prisma.timeline.findFirst({
    where: { id: existing.timelineId, userId: session.user.id },
  });
  if (!timeline) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.event.delete({ where: { id } });

  // Touch the timeline's updatedAt
  await prisma.timeline.update({
    where: { id: existing.timelineId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}

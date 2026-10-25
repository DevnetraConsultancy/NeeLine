import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Utility: parse layer name from stored description
function parseLayer(rawDescription: string | null): { layer: string; description: string | null } {
  if (!rawDescription) return { layer: "General", description: null };
  const match = rawDescription.match(/^<!--layer:([^>]+)-->([\s\S]*)$/);
  if (match) {
    return {
      layer: match[1].trim() || "General",
      description: match[2].trim() || null,
    };
  }
  return { layer: "General", description: rawDescription };
}

// Utility: encode layer name into stored description
function serializeLayer(layer: string | undefined | null, description: string | null): string | null {
  const safeLayer = layer && layer.trim() && layer.trim() !== "General" ? layer.trim() : null;
  const safeDesc = description ? description.trim() : "";
  if (safeLayer) {
    return `<!--layer:${safeLayer}-->${safeDesc}`;
  }
  return safeDesc || null;
}

// GET /api/events?timelineId=xxx
export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    const rawEvents = await prisma.event.findMany({
      where: { timelineId },
    });

    // Parse layer metadata out of description
    const events = rawEvents.map((e) => {
      const parsed = parseLayer(e.description);
      return {
        ...e,
        layer: parsed.layer,
        description: parsed.description,
      };
    });

    // Sort chronologically from deepest antiquity to modern era
    events.sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      if (ya !== yb) return ya - yb;
      const ma = a.month ?? 0;
      const mb = b.month ?? 0;
      if (ma !== mb) return ma - mb;
      const da = a.day ?? 0;
      const db = b.day ?? 0;
      return da - db;
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events - Create a new event or batch import
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Batch creation support for high-performance JSON imports
    if (Array.isArray(body.events) && body.timelineId) {
      const timeline = await prisma.timeline.findFirst({
        where: { id: body.timelineId, userId: session.user.id },
      });
      if (!timeline) {
        return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
      }

      interface RawEventItem {
        year?: number | string;
        isBce?: boolean;
        month?: number | string | null;
        day?: number | string | null;
        title?: string;
        description?: string | null;
        color?: string;
        layer?: string | null;
      }

      const createData = (body.events as RawEventItem[]).map((e) => ({
        timelineId: body.timelineId as string,
        year: Math.abs(parseInt(String(e.year || 0), 10)),
        isBce: Boolean(e.isBce),
        month: e.month ? Math.min(12, Math.max(1, parseInt(String(e.month), 10))) : null,
        day: e.day ? Math.min(31, Math.max(1, parseInt(String(e.day), 10))) : null,
        title: String(e.title || "Untitled").trim(),
        description: serializeLayer(e.layer, e.description || null),
        color: typeof e.color === "string" && e.color.startsWith("#") ? e.color : "#c9a84c",
      }));

      await prisma.event.createMany({
        data: createData,
      });

      await prisma.timeline.update({
        where: { id: body.timelineId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, count: createData.length }, { status: 201 });
    }

    // Single event creation
    const { timelineId, year, isBce, month, day, title, description, color, layer } = body;

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

    const fullDescription = serializeLayer(layer, description || null);

    const event = await prisma.event.create({
      data: {
        timelineId,
        year: Math.abs(parseInt(year, 10)),
        isBce: Boolean(isBce),
        month: month ? Math.min(12, Math.max(1, parseInt(month, 10))) : null,
        day: day ? Math.min(31, Math.max(1, parseInt(day, 10))) : null,
        title: String(title).trim(),
        description: fullDescription,
        color: typeof color === "string" && color.startsWith("#") ? color : "#c9a84c",
      },
    });

    // Touch the timeline's updatedAt
    await prisma.timeline.update({
      where: { id: timelineId },
      data: { updatedAt: new Date() },
    });

    const parsed = parseLayer(event.description);
    return NextResponse.json({ ...event, ...parsed }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// PATCH /api/events?id=xxx - Update an event
export async function PATCH(req: NextRequest) {
  try {
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

    if (body.year !== undefined) data.year = Math.abs(parseInt(body.year, 10));
    if (body.isBce !== undefined) data.isBce = Boolean(body.isBce);
    if (body.month !== undefined) {
      data.month = body.month ? Math.min(12, Math.max(1, parseInt(body.month, 10))) : null;
    }
    if (body.day !== undefined) {
      data.day = body.day ? Math.min(31, Math.max(1, parseInt(body.day, 10))) : null;
    }
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.color !== undefined) {
      data.color = typeof body.color === "string" && body.color.startsWith("#") ? body.color : "#c9a84c";
    }

    if (body.description !== undefined || body.layer !== undefined) {
      const parsed = parseLayer(existing.description);
      const nextDesc = body.description !== undefined ? body.description : parsed.description;
      const nextLayer = body.layer !== undefined ? body.layer : parsed.layer;
      data.description = serializeLayer(nextLayer, nextDesc);
    }

    const updated = await prisma.event.update({
      where: { id },
      data,
    });

    // Touch the timeline's updatedAt
    await prisma.timeline.update({
      where: { id: existing.timelineId },
      data: { updatedAt: new Date() },
    });

    const parsed = parseLayer(updated.description);
    return NextResponse.json({ ...updated, ...parsed });
  } catch (error) {
    console.error("PATCH /api/events error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/events?id=xxx
export async function DELETE(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

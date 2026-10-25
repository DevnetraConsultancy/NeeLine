import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseEventMetadata,
  serializeEventMetadata,
} from "@/lib/event-metadata";

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

    // Parse layer and span metadata out of description
    const events = rawEvents.map((e) => {
      const parsed = parseEventMetadata(e.description);
      return {
        ...e,
        layer: parsed.layer,
        description: parsed.description,
        endYear: parsed.endYear,
        endIsBce: parsed.endIsBce,
        endMonth: parsed.endMonth,
        endDay: parsed.endDay,
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
        endYear?: number | string | null;
        endIsBce?: boolean | null;
        endMonth?: number | string | null;
        endDay?: number | string | null;
      }

      const createData = (body.events as RawEventItem[]).map((e) => {
        const hasSpan = e.endYear !== undefined && e.endYear !== null && String(e.endYear).trim() !== "";
        return {
          timelineId: body.timelineId as string,
          year: Math.abs(parseInt(String(e.year || 0), 10)),
          isBce: Boolean(e.isBce),
          month: e.month ? Math.min(12, Math.max(1, parseInt(String(e.month), 10))) : null,
          day: e.day ? Math.min(31, Math.max(1, parseInt(String(e.day), 10))) : null,
          title: String(e.title || "Untitled").trim(),
          description: serializeEventMetadata(
            {
              layer: e.layer,
              endYear: hasSpan ? Math.abs(parseInt(String(e.endYear), 10)) : null,
              endIsBce: hasSpan ? Boolean(e.endIsBce) : null,
              endMonth: e.endMonth ? Math.min(12, Math.max(1, parseInt(String(e.endMonth), 10))) : null,
              endDay: e.endDay ? Math.min(31, Math.max(1, parseInt(String(e.endDay), 10))) : null,
            },
            e.description || null
          ),
          color: typeof e.color === "string" && e.color.startsWith("#") ? e.color : "#c9a84c",
        };
      });

      const created = await prisma.event.createManyAndReturn({
        data: createData,
      });

      await prisma.timeline.update({
        where: { id: body.timelineId },
        data: { updatedAt: new Date() },
      });

      const formatted = created.map((e) => {
        const parsed = parseEventMetadata(e.description);
        return {
          ...e,
          layer: parsed.layer,
          description: parsed.description,
          endYear: parsed.endYear,
          endIsBce: parsed.endIsBce,
          endMonth: parsed.endMonth,
          endDay: parsed.endDay,
        };
      });

      return NextResponse.json(formatted, { status: 201 });
    }

    // Single event creation
    const {
      timelineId,
      year,
      isBce,
      month,
      day,
      title,
      description,
      color,
      layer,
      endYear,
      endIsBce,
      endMonth,
      endDay,
    } = body;

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

    const hasSpan = endYear !== undefined && endYear !== null && String(endYear).trim() !== "";
    const fullDescription = serializeEventMetadata(
      {
        layer,
        endYear: hasSpan ? Math.abs(parseInt(String(endYear), 10)) : null,
        endIsBce: hasSpan ? Boolean(endIsBce) : null,
        endMonth: endMonth ? Math.min(12, Math.max(1, parseInt(String(endMonth), 10))) : null,
        endDay: endDay ? Math.min(31, Math.max(1, parseInt(String(endDay), 10))) : null,
      },
      description || null
    );

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

    const parsed = parseEventMetadata(event.description);
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

    if (
      body.description !== undefined ||
      body.layer !== undefined ||
      body.endYear !== undefined ||
      body.endIsBce !== undefined ||
      body.endMonth !== undefined ||
      body.endDay !== undefined
    ) {
      const parsed = parseEventMetadata(existing.description);
      const nextDesc = body.description !== undefined ? body.description : parsed.description;
      const nextLayer = body.layer !== undefined ? body.layer : parsed.layer;
      const nextEndYear =
        body.endYear !== undefined
          ? body.endYear !== null && String(body.endYear).trim() !== ""
            ? Math.abs(parseInt(String(body.endYear), 10))
            : null
          : parsed.endYear;
      const nextEndIsBce =
        body.endIsBce !== undefined ? (nextEndYear !== null ? Boolean(body.endIsBce) : null) : parsed.endIsBce;
      const nextEndMonth =
        body.endMonth !== undefined
          ? body.endMonth ? Math.min(12, Math.max(1, parseInt(String(body.endMonth), 10))) : null
          : parsed.endMonth;
      const nextEndDay =
        body.endDay !== undefined
          ? body.endDay ? Math.min(31, Math.max(1, parseInt(String(body.endDay), 10))) : null
          : parsed.endDay;

      data.description = serializeEventMetadata(
        {
          layer: nextLayer,
          endYear: nextEndYear,
          endIsBce: nextEndIsBce,
          endMonth: nextEndMonth,
          endDay: nextEndDay,
        },
        nextDesc
      );
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

    const parsed = parseEventMetadata(updated.description);
    return NextResponse.json({ ...updated, ...parsed });
  } catch (error) {
    console.error("PATCH /api/events error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/events?id=xxx or body { ids: string[] }
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    let ids: string[] = [];
    if (!id) {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) {
          ids = body.ids;
        }
      } catch {
        // no body provided
      }
    } else {
      ids = [id];
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "Missing id or ids" }, { status: 400 });
    }

    // Verify ownership through timeline
    const targetEvents = await prisma.event.findMany({
      where: {
        id: { in: ids },
        timeline: { userId: session.user.id },
      },
      select: { id: true, timelineId: true },
    });

    if (targetEvents.length === 0) {
      return NextResponse.json(
        { error: "No matching events found or unauthorized" },
        { status: 404 }
      );
    }

    const verifiedIds = targetEvents.map((e) => e.id);
    await prisma.event.deleteMany({
      where: { id: { in: verifiedIds } },
    });

    const affectedTimelineIds = Array.from(new Set(targetEvents.map((e) => e.timelineId)));
    await Promise.all(
      affectedTimelineIds.map((tid) =>
        prisma.timeline.update({
          where: { id: tid },
          data: { updatedAt: new Date() },
        })
      )
    );

    return NextResponse.json({ success: true, count: verifiedIds.length });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

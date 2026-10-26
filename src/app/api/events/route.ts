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
      orderBy: { createdAt: "asc" },
    });

    // Parse layer and span metadata out of description
    const parsedRaw = rawEvents.map((e) => {
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

    // Deduplicate exact matching events in the database (e.g. from repeated imports)
    const seenEventKeys = new Set<string>();
    const events: typeof parsedRaw = [];
    const duplicateIdsToDelete: string[] = [];

    for (const item of parsedRaw) {
      const normTitle = item.title.trim().toLowerCase();
      const normYear = item.year;
      const normBce = Boolean(item.isBce);
      const normMonth = item.month ?? "";
      const normDay = item.day ?? "";
      const normLayer = (item.layer?.trim() || "general").toLowerCase();
      const normEndYear = item.endYear ?? "";
      const normEndBce = item.endIsBce ? "1" : "0";
      const normEndMonth = item.endMonth ?? "";
      const normEndDay = item.endDay ?? "";
      const normDesc = (item.description || "").trim().toLowerCase();

      const key = `${normTitle}|${normYear}|${normBce}|${normMonth}|${normDay}|${normLayer}|${normEndYear}|${normEndBce}|${normEndMonth}|${normEndDay}|${normDesc}`;

      if (seenEventKeys.has(key)) {
        duplicateIdsToDelete.push(item.id);
      } else {
        seenEventKeys.add(key);
        events.push(item);
      }
    }

    // Permanently purge duplicate rows from database in background
    if (duplicateIdsToDelete.length > 0) {
      try {
        await prisma.event.deleteMany({
          where: { id: { in: duplicateIdsToDelete } },
        });
      } catch (delErr) {
        console.warn("Failed to purge duplicate events:", delErr);
      }
    }

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
        const rawYear = parseInt(String(e.year || 0), 10);
        const safeYear = !isNaN(rawYear) ? rawYear : 0;
        const isBce =
          e.isBce !== undefined && e.isBce !== null
            ? Boolean(e.isBce)
            : safeYear < 0;

        const rawMonth =
          e.month !== undefined && e.month !== null && String(e.month).trim() !== ""
            ? parseInt(String(e.month), 10)
            : NaN;
        const validMonth = !isNaN(rawMonth)
          ? Math.min(12, Math.max(1, rawMonth))
          : null;

        const rawDay =
          e.day !== undefined && e.day !== null && String(e.day).trim() !== ""
            ? parseInt(String(e.day), 10)
            : NaN;
        const validDay = !isNaN(rawDay)
          ? Math.min(31, Math.max(1, rawDay))
          : null;

        const rawEndYear =
          e.endYear !== undefined && e.endYear !== null && String(e.endYear).trim() !== ""
            ? parseInt(String(e.endYear), 10)
            : NaN;
        const hasSpan = !isNaN(rawEndYear);
        const endIsBce = hasSpan
          ? e.endIsBce !== undefined && e.endIsBce !== null
            ? Boolean(e.endIsBce)
            : rawEndYear < 0
          : null;

        const rawEndMonth =
          hasSpan && e.endMonth !== undefined && e.endMonth !== null && String(e.endMonth).trim() !== ""
            ? parseInt(String(e.endMonth), 10)
            : NaN;
        const validEndMonth = !isNaN(rawEndMonth)
          ? Math.min(12, Math.max(1, rawEndMonth))
          : null;

        const rawEndDay =
          hasSpan && e.endDay !== undefined && e.endDay !== null && String(e.endDay).trim() !== ""
            ? parseInt(String(e.endDay), 10)
            : NaN;
        const validEndDay = !isNaN(rawEndDay)
          ? Math.min(31, Math.max(1, rawEndDay))
          : null;

        return {
          timelineId: body.timelineId as string,
          year: Math.abs(safeYear),
          isBce,
          month: validMonth,
          day: validDay,
          title: String(e.title || "Untitled").trim(),
          description: serializeEventMetadata(
            {
              layer: e.layer,
              endYear: hasSpan ? Math.abs(rawEndYear) : null,
              endIsBce,
              endMonth: validEndMonth,
              endDay: validEndDay,
            },
            e.description || null
          ),
          color:
            typeof e.color === "string" && e.color.startsWith("#")
              ? e.color
              : "#c9a84c",
        };
      });

      // Query existing events in this timeline to avoid inserting duplicate rows
      const existingDbEvents = await prisma.event.findMany({
        where: { timelineId: body.timelineId },
      });
      const existingKeySet = new Set<string>();
      for (const ev of existingDbEvents) {
        const meta = parseEventMetadata(ev.description);
        const k = `${ev.title.trim().toLowerCase()}|${ev.year}|${Boolean(ev.isBce)}|${ev.month ?? ""}|${ev.day ?? ""}|${(meta.layer?.trim() || "general").toLowerCase()}|${meta.endYear ?? ""}|${meta.endIsBce ? "1" : "0"}|${meta.endMonth ?? ""}|${meta.endDay ?? ""}|${(meta.description || "").trim().toLowerCase()}`;
        existingKeySet.add(k);
      }

      // Deduplicate batch items against existing events and within the batch itself
      const uniqueCreateData = [];
      for (const item of createData) {
        const meta = parseEventMetadata(item.description);
        const k = `${item.title.trim().toLowerCase()}|${item.year}|${Boolean(item.isBce)}|${item.month ?? ""}|${item.day ?? ""}|${(meta.layer?.trim() || "general").toLowerCase()}|${meta.endYear ?? ""}|${meta.endIsBce ? "1" : "0"}|${meta.endMonth ?? ""}|${meta.endDay ?? ""}|${(meta.description || "").trim().toLowerCase()}`;
        if (!existingKeySet.has(k)) {
          existingKeySet.add(k);
          uniqueCreateData.push(item);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let created: any[] = [];
      if (uniqueCreateData.length > 0) {
        created = await prisma.event.createManyAndReturn({
          data: uniqueCreateData,
        });

        await prisma.timeline.update({
          where: { id: body.timelineId },
          data: { updatedAt: new Date() },
        });
      }

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

    const rawYear = parseInt(String(year || 0), 10);
    const safeYear = !isNaN(rawYear) ? rawYear : 0;
    const finalIsBce = isBce !== undefined && isBce !== null ? Boolean(isBce) : safeYear < 0;

    const rawMonth = month !== undefined && month !== null && String(month).trim() !== "" ? parseInt(String(month), 10) : NaN;
    const validMonth = !isNaN(rawMonth) ? Math.min(12, Math.max(1, rawMonth)) : null;

    const rawDay = day !== undefined && day !== null && String(day).trim() !== "" ? parseInt(String(day), 10) : NaN;
    const validDay = !isNaN(rawDay) ? Math.min(31, Math.max(1, rawDay)) : null;

    const rawEndYear = endYear !== undefined && endYear !== null && String(endYear).trim() !== "" ? parseInt(String(endYear), 10) : NaN;
    const hasSpan = !isNaN(rawEndYear);
    const finalEndIsBce = hasSpan
      ? endIsBce !== undefined && endIsBce !== null
        ? Boolean(endIsBce)
        : rawEndYear < 0
      : null;

    const rawEndMonth = hasSpan && endMonth !== undefined && endMonth !== null && String(endMonth).trim() !== "" ? parseInt(String(endMonth), 10) : NaN;
    const validEndMonth = !isNaN(rawEndMonth) ? Math.min(12, Math.max(1, rawEndMonth)) : null;

    const rawEndDay = hasSpan && endDay !== undefined && endDay !== null && String(endDay).trim() !== "" ? parseInt(String(endDay), 10) : NaN;
    const validEndDay = !isNaN(rawEndDay) ? Math.min(31, Math.max(1, rawEndDay)) : null;

    const fullDescription = serializeEventMetadata(
      {
        layer,
        endYear: hasSpan ? Math.abs(rawEndYear) : null,
        endIsBce: finalEndIsBce,
        endMonth: validEndMonth,
        endDay: validEndDay,
      },
      description || null
    );

    const event = await prisma.event.create({
      data: {
        timelineId,
        year: Math.abs(safeYear),
        isBce: finalIsBce,
        month: validMonth,
        day: validDay,
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

    if (body.year !== undefined) {
      const py = parseInt(String(body.year), 10);
      if (!isNaN(py)) {
        data.year = Math.abs(py);
        if (body.isBce === undefined && py < 0) {
          data.isBce = true;
        }
      }
    }
    if (body.isBce !== undefined) data.isBce = Boolean(body.isBce);
    if (body.month !== undefined) {
      const pm = body.month !== null && String(body.month).trim() !== "" ? parseInt(String(body.month), 10) : NaN;
      data.month = !isNaN(pm) ? Math.min(12, Math.max(1, pm)) : null;
    }
    if (body.day !== undefined) {
      const pd = body.day !== null && String(body.day).trim() !== "" ? parseInt(String(body.day), 10) : NaN;
      data.day = !isNaN(pd) ? Math.min(31, Math.max(1, pd)) : null;
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
      
      let nextEndYear = parsed.endYear;
      let nextEndIsBce = parsed.endIsBce;
      if (body.endYear !== undefined) {
        if (body.endYear !== null && String(body.endYear).trim() !== "") {
          const pey = parseInt(String(body.endYear), 10);
          if (!isNaN(pey)) {
            nextEndYear = Math.abs(pey);
            if (body.endIsBce === undefined && pey < 0) {
              nextEndIsBce = true;
            }
          } else {
            nextEndYear = null;
          }
        } else {
          nextEndYear = null;
        }
      }
      if (body.endIsBce !== undefined) {
        nextEndIsBce = nextEndYear !== null ? Boolean(body.endIsBce) : null;
      }

      const nextEndMonth =
        body.endMonth !== undefined
          ? body.endMonth !== null && String(body.endMonth).trim() !== ""
            ? !isNaN(parseInt(String(body.endMonth), 10))
              ? Math.min(12, Math.max(1, parseInt(String(body.endMonth), 10)))
              : null
            : null
          : parsed.endMonth;

      const nextEndDay =
        body.endDay !== undefined
          ? body.endDay !== null && String(body.endDay).trim() !== ""
            ? !isNaN(parseInt(String(body.endDay), 10))
              ? Math.min(31, Math.max(1, parseInt(String(body.endDay), 10)))
              : null
            : null
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

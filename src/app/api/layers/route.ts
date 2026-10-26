import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEventMetadata, serializeEventMetadata } from "@/lib/event-metadata";

// GET /api/layers?timelineId=xxx - Discover layers from timeline events
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
      include: { events: true },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    const layerMap = new Map<string, { id: string; name: string; color: string }>();

    // Always include General layer
    layerMap.set("general", {
      id: "layer-general",
      name: "General",
      color: "#c9a84c",
    });

    // Extract layers from existing events
    for (const ev of timeline.events) {
      const { layer } = parseEventMetadata(ev.description);
      const cleanLayer = (layer && layer.trim()) || "General";
      const key = cleanLayer.toLowerCase();
      if (!layerMap.has(key)) {
        layerMap.set(key, {
          id: `layer-${cleanLayer.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: cleanLayer,
          color: ev.color && ev.color.startsWith("#") ? ev.color : "#5a9bd5",
        });
      }
    }

    return NextResponse.json(Array.from(layerMap.values()));
  } catch (error) {
    console.error("GET /api/layers error:", error);
    return NextResponse.json({ error: "Failed to fetch layers" }, { status: 500 });
  }
}

// POST /api/layers - Register / create a new layer
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { timelineId, name, color } = body;

    if (!timelineId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: timelineId, name" },
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

    const safeName = String(name).trim();
    const safeColor = typeof color === "string" && color.startsWith("#") ? color : "#c9a84c";

    const layer = {
      id: `layer-${safeName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      timelineId,
      name: safeName,
      color: safeColor,
    };

    return NextResponse.json(layer, { status: 201 });
  } catch (error) {
    console.error("POST /api/layers error:", error);
    return NextResponse.json({ error: "Failed to create layer" }, { status: 500 });
  }
}

// DELETE /api/layers?timelineId=xxx&name=xxx
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const timelineId = url.searchParams.get("timelineId");
    const name = url.searchParams.get("name");

    if (!timelineId || !name) {
      return NextResponse.json(
        { error: "Missing required query parameters: timelineId, name" },
        { status: 400 }
      );
    }

    const safeName = decodeURIComponent(name).trim();
    if (safeName.toLowerCase() === "general") {
      return NextResponse.json(
        { error: "Cannot delete the default General layer" },
        { status: 400 }
      );
    }

    // Verify ownership
    const timeline = await prisma.timeline.findFirst({
      where: { id: timelineId, userId: session.user.id },
      include: { events: true },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    // Find all events belonging to this timeline that are assigned to this layer (case-insensitive)
    const targetLayerLower = safeName.toLowerCase();
    const eventsToUpdate: { id: string; description: string | null }[] = [];

    for (const ev of timeline.events) {
      const parsed = parseEventMetadata(ev.description);
      const evLayer = ((parsed.layer && parsed.layer.trim()) || "General").toLowerCase();
      if (evLayer === targetLayerLower) {
        // Re-serialize with layer reassigned to "General"
        const updatedDesc = serializeEventMetadata(
          {
            layer: "General",
            endYear: parsed.endYear,
            endIsBce: parsed.endIsBce,
            endMonth: parsed.endMonth,
            endDay: parsed.endDay,
          },
          parsed.description
        );
        eventsToUpdate.push({ id: ev.id, description: updatedDesc });
      }
    }

    // Update all matching events in database atomically
    if (eventsToUpdate.length > 0) {
      await prisma.$transaction(
        eventsToUpdate.map((item) =>
          prisma.event.update({
            where: { id: item.id },
            data: { description: item.description },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      deletedLayer: safeName,
      migratedEventsCount: eventsToUpdate.length,
    });
  } catch (error) {
    console.error("DELETE /api/layers error:", error);
    return NextResponse.json({ error: "Failed to delete layer" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEventMetadata } from "@/lib/event-metadata";

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

    // If timeline has no events and no layers yet, provide General as initial starter layer
    if (layerMap.size === 0) {
      layerMap.set("general", {
        id: "layer-general",
        name: "General",
        color: "#c9a84c",
      });
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

// DELETE /api/layers?timelineId=xxx&name=xxx - Permanently delete a layer and ALL of its events and periods
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
    const eventIdsToDelete: string[] = [];

    for (const ev of timeline.events) {
      const parsed = parseEventMetadata(ev.description);
      const evLayer = ((parsed.layer && parsed.layer.trim()) || "General").toLowerCase();

      const rawDesc = (ev.description || "").toLowerCase();
      const matchesMetaTag =
        rawDesc.includes(`"layer":"${targetLayerLower}"`) ||
        rawDesc.includes(`"layer": "${targetLayerLower}"`);
      const matchesLegacyTag = rawDesc.startsWith(`<!--layer:${targetLayerLower}-->`);

      if (evLayer === targetLayerLower || matchesMetaTag || matchesLegacyTag) {
        eventIdsToDelete.push(ev.id);
      }
    }

    // Permanently delete all matching events and periods from database
    let deletedCount = 0;
    if (eventIdsToDelete.length > 0) {
      const deleteResult = await prisma.event.deleteMany({
        where: {
          id: { in: eventIdsToDelete },
          timelineId: timeline.id,
        },
      });
      deletedCount = deleteResult.count;
    }

    return NextResponse.json({
      success: true,
      deletedLayer: safeName,
      deletedEventsCount: deletedCount,
    });
  } catch (error) {
    console.error("DELETE /api/layers error:", error);
    return NextResponse.json({ error: "Failed to delete layer" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEventMetadata, serializeEventMetadata } from "@/lib/event-metadata";
import { CANVAS_COLOR_PRESETS } from "@/types";

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
      include: {
        events: {
          select: {
            id: true,
            description: true,
            color: true,
          },
        },
      },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    const layerMap = new Map<string, { id: string; name: string; color: string }>();
    const usedColors = new Set<string>();

    // 1. General Layer is ALWAYS the default foundation layer (at index 0)
    layerMap.set("general", {
      id: "layer-general",
      name: "General",
      color: CANVAS_COLOR_PRESETS[0].hex,
    });
    usedColors.add(CANVAS_COLOR_PRESETS[0].hex.toLowerCase());

    // 2. Extract any other layers from existing events, assigning distinct colors from CANVAS_COLOR_PRESETS
    for (const ev of timeline.events) {
      const { layer } = parseEventMetadata(ev.description);
      const cleanLayer = (layer && layer.trim()) || "General";
      const key = cleanLayer.toLowerCase();
      if (!layerMap.has(key)) {
        let assignedColor = "";
        const isPreset = CANVAS_COLOR_PRESETS.some((p) => p.hex.toLowerCase() === (ev.color || "").toLowerCase());
        if (ev.color && isPreset && !usedColors.has(ev.color.toLowerCase())) {
          assignedColor = ev.color;
        } else {
          const free = CANVAS_COLOR_PRESETS.find((p) => !usedColors.has(p.hex.toLowerCase()));
          assignedColor = free
            ? free.hex
            : CANVAS_COLOR_PRESETS[layerMap.size % CANVAS_COLOR_PRESETS.length].hex;
        }
        usedColors.add(assignedColor.toLowerCase());

        layerMap.set(key, {
          id: `layer-${cleanLayer.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: cleanLayer,
          color: assignedColor,
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

    // Verify ownership and fetch existing events to check used layer colors
    const timeline = await prisma.timeline.findFirst({
      where: { id: timelineId, userId: session.user.id },
      include: {
        events: {
          select: {
            description: true,
            color: true,
          },
        },
      },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    const safeName = String(name).trim();

    // Check existing layer colors
    const existingUsedColors = new Set<string>();
    for (const ev of timeline.events) {
      const { layer } = parseEventMetadata(ev.description);
      if (layer && ev.color && ev.color.startsWith("#")) {
        existingUsedColors.add(ev.color.toLowerCase());
      }
    }

    let safeColor = typeof color === "string" && color.startsWith("#") ? color : "";
    const isValidPreset = CANVAS_COLOR_PRESETS.some((p) => p.hex.toLowerCase() === safeColor.toLowerCase());
    if (!isValidPreset || existingUsedColors.has(safeColor.toLowerCase())) {
      const free = CANVAS_COLOR_PRESETS.find((p) => !existingUsedColors.has(p.hex.toLowerCase()));
      safeColor = free ? free.hex : CANVAS_COLOR_PRESETS[0].hex;
    }

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

// PATCH /api/layers - Rename a layer or change its color across all events
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { timelineId, oldName, newName, color } = body;

    if (!timelineId || !oldName) {
      return NextResponse.json(
        { error: "Missing required fields: timelineId, oldName" },
        { status: 400 }
      );
    }

    // Verify ownership
    const timeline = await prisma.timeline.findFirst({
      where: { id: timelineId, userId: session.user.id },
      include: {
        events: {
          select: {
            id: true,
            description: true,
            color: true,
          },
        },
      },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    const targetOldLower = String(oldName).trim().toLowerCase();
    const cleanNewName = newName ? String(newName).trim() : null;

    if (cleanNewName && cleanNewName.toLowerCase() !== targetOldLower) {
      // Find all events with old layer name and update to cleanNewName
      for (const ev of timeline.events) {
        const parsed = parseEventMetadata(ev.description);
        const evLayer = ((parsed.layer && parsed.layer.trim()) || "General").toLowerCase();
        if (evLayer === targetOldLower) {
          const updatedDescription = serializeEventMetadata(
            {
              layer: cleanNewName,
              endYear: parsed.endYear,
              endIsBce: parsed.endIsBce,
              endMonth: parsed.endMonth,
              endDay: parsed.endDay,
            },
            parsed.description
          );
          await prisma.event.update({
            where: { id: ev.id },
            data: { description: updatedDescription },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      oldName: String(oldName).trim(),
      newName: cleanNewName || String(oldName).trim(),
      color: color || undefined,
    });
  } catch (error) {
    console.error("PATCH /api/layers error:", error);
    return NextResponse.json({ error: "Failed to update layer" }, { status: 500 });
  }
}

// DELETE /api/layers?timelineId=xxx&name=xxx&deleteEvents=true|false
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const timelineId = url.searchParams.get("timelineId");
    const name = url.searchParams.get("name");
    const deleteEvents = url.searchParams.get("deleteEvents") !== "false";

    if (!timelineId || !name) {
      return NextResponse.json(
        { error: "Missing required query parameters: timelineId, name" },
        { status: 400 }
      );
    }

    const safeName = decodeURIComponent(name).trim();
    if (safeName.toLowerCase() === "general") {
      return NextResponse.json(
        { error: "The default 'General' layer cannot be deleted." },
        { status: 400 }
      );
    }

    // Verify ownership
    const timeline = await prisma.timeline.findFirst({
      where: { id: timelineId, userId: session.user.id },
      include: {
        events: {
          select: {
            id: true,
            description: true,
            color: true,
          },
        },
      },
    });
    if (!timeline) {
      return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
    }

    // Find all events belonging to this timeline that are assigned to this layer (case-insensitive)
    const targetLayerLower = safeName.toLowerCase();
    const matchingEvents: { id: string; description: string | null }[] = [];

    for (const ev of timeline.events) {
      const parsed = parseEventMetadata(ev.description);
      const evLayer = ((parsed.layer && parsed.layer.trim()) || "General").toLowerCase();

      const rawDesc = (ev.description || "").toLowerCase();
      const matchesMetaTag =
        rawDesc.includes(`"layer":"${targetLayerLower}"`) ||
        rawDesc.includes(`"layer": "${targetLayerLower}"`);
      const matchesLegacyTag = rawDesc.startsWith(`<!--layer:${targetLayerLower}-->`);

      if (evLayer === targetLayerLower || matchesMetaTag || matchesLegacyTag) {
        matchingEvents.push({ id: ev.id, description: ev.description });
      }
    }

    let affectedCount = 0;
    if (deleteEvents) {
      // 1. Permanently delete all events in this layer
      if (matchingEvents.length > 0) {
        const deleteResult = await prisma.event.deleteMany({
          where: {
            id: { in: matchingEvents.map((e) => e.id) },
            timelineId: timeline.id,
          },
        });
        affectedCount = deleteResult.count;
      }
    } else {
      // 2. Keep events, moving them all to the default "General" layer
      for (const ev of matchingEvents) {
        const parsed = parseEventMetadata(ev.description);
        const updatedDescription = serializeEventMetadata(
          {
            layer: "General",
            endYear: parsed.endYear,
            endIsBce: parsed.endIsBce,
            endMonth: parsed.endMonth,
            endDay: parsed.endDay,
          },
          parsed.description
        );
        await prisma.event.update({
          where: { id: ev.id },
          data: { description: updatedDescription },
        });
        affectedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedLayer: safeName,
      deleteEvents,
      affectedEventsCount: affectedCount,
    });
  } catch (error) {
    console.error("DELETE /api/layers error:", error);
    return NextResponse.json({ error: "Failed to delete layer" }, { status: 500 });
  }
}

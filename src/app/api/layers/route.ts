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

    // Always include General layer
    layerMap.set("General", {
      id: "layer-general",
      name: "General",
      color: "#c9a84c",
    });

    // Extract layers from existing events
    for (const ev of timeline.events) {
      const { layer } = parseEventMetadata(ev.description);
      if (!layerMap.has(layer)) {
        layerMap.set(layer, {
          id: `layer-${layer.toLowerCase().replace(/\s+/g, "-")}`,
          name: layer,
          color: ev.color || "#5a9bd5",
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
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

// DELETE /api/layers?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    void id;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/layers error:", error);
    return NextResponse.json({ error: "Failed to delete layer" }, { status: 500 });
  }
}

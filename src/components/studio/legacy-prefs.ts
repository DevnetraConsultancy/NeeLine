"use client";

import { isHexColor } from "@/lib/domain/colors";
import { layerNameKey } from "@/lib/domain/layers";
import type { StudioData } from "@/types/api";
import type { Studio } from "@/components/studio/use-studio";

/**
 * The previous release kept layer colours, order, visibility, empty layers and
 * the timeline description in this browser's localStorage. Move them to the
 * server once, then remove the keys. Returns true when anything was applied.
 */
export async function migrateLegacyPrefs(timelineId: string, data: StudioData, studio: Studio): Promise<boolean> {
  const keys = {
    layers: `neeline_layers_${timelineId}`,
    active: `neeline_active_layers_${timelineId}`,
    description: `neeline_desc_${timelineId}`,
  };
  let raw: { layers: string | null; active: string | null; description: string | null };
  try {
    raw = { layers: localStorage.getItem(keys.layers), active: localStorage.getItem(keys.active), description: localStorage.getItem(keys.description) };
  } catch {
    return false;
  }
  if (!raw.layers && !raw.active && !raw.description) return false;

  const parse = (s: string | null): unknown => {
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };

  let allSaved = true;
  const byKey = new Map(data.layers.map((l) => [layerNameKey(l.name), l]));
  const cachedLayers = Array.isArray(parse(raw.layers)) ? (parse(raw.layers) as Array<{ name?: unknown; color?: unknown }>) : [];
  const order: string[] = [];

  for (const cached of cachedLayers) {
    if (typeof cached.name !== "string" || !cached.name.trim()) continue;
    const key = layerNameKey(cached.name);
    const color = isHexColor(cached.color) ? cached.color.toLowerCase() : null;
    let layer = byKey.get(key);
    if (!layer && color) {
      layer = await studio.createLayer(cached.name.trim(), color);
      byKey.set(key, layer);
    } else if (layer && color && color !== layer.color.toLowerCase()) {
      await studio.updateLayer(layer.id, { color });
    }
    if (layer && !order.includes(layer.id)) order.push(layer.id);
  }

  if (order.length > 0) {
    const all = Array.from(byKey.values());
    const full = [...order, ...all.map((l) => l.id).filter((id) => !order.includes(id))];
    if (full.join() !== data.layers.map((l) => l.id).join()) allSaved = (await studio.reorderLayers(full)) && allSaved;
  }

  const active = parse(raw.active);
  if (Array.isArray(active) && active.length > 0) {
    const ids = active.flatMap((name) => (typeof name === "string" && byKey.get(layerNameKey(name)) ? [byKey.get(layerNameKey(name))!.id] : []));
    if (ids.length > 0) allSaved = (await studio.setVisibleLayers(ids)) && allSaved;
  }

  if (raw.description && !data.timeline.description) {
    await studio.updateTimeline({ description: raw.description.slice(0, 5000) });
  }

  // Keep the old settings if anything failed, so the next visit can try again.
  if (!allSaved) throw new Error("Some layer settings could not be saved; they will be retried next time.");
  for (const key of Object.values(keys)) localStorage.removeItem(key);
  return true;
}

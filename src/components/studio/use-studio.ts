"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiRequestError, errorMessage } from "@/lib/client/api";
import { eventFields, sortByDate, type EventFields, type TimelineEvent } from "@/lib/domain/events";
import {
  afterRedo, afterUndo, discard, emptyHistory, forgetEvents, moveLayer, record, redoOperation, undoOperation,
  type History, type HistoryAction, type HistoryOperation,
} from "@/lib/domain/history";
import type { ImportResult, Layer, LayerDeleteResult, StudioData, TimelineDetail } from "@/types/api";
import { useToast } from "@/components/ui/toast";

export type SaveState = "saved" | "saving" | "error";
type TimelinePatch = Partial<{ name: string; description: string | null; bgColor: string | null; spineColor: string | null; tickColor: string | null; textColor: string | null }>;

/**
 * All studio data and every change to it. Changes are sent to the server
 * first and applied locally only when the server accepts them, so the screen
 * never shows something that was not saved. Failures raise a toast.
 */
export function useStudio(timelineId: string) {
  const toast = useToast();
  const [data, setData] = useState<StudioData | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [pending, setPending] = useState(0);
  const [lastFailed, setLastFailed] = useState(false);
  const historyBusy = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoadError(null);
      setData(await api.get<StudioData>(`/api/timelines/${timelineId}`, signal));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError({ status: error instanceof ApiRequestError ? error.status : 0, message: errorMessage(error) });
    }
  }, [timelineId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Runs a server change, tracking the save indicator. Rethrows so callers can react. */
  const track = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    setPending((n) => n + 1);
    try {
      const result = await work();
      setLastFailed(false);
      return result;
    } catch (error) {
      setLastFailed(true);
      throw error;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  /** Like track, but shows the error as a toast instead of rethrowing. */
  const attempt = useCallback(async <T,>(work: () => Promise<T>, failure: string): Promise<T | undefined> => {
    try {
      return await track(work);
    } catch (error) {
      toast.error(failure, { description: errorMessage(error) });
      return undefined;
    }
  }, [toast, track]);

  const patchData = useCallback((fn: (d: StudioData) => StudioData) => setData((d) => (d ? fn(d) : d)), []);
  const upsertEvents = (events: TimelineEvent[], incoming: TimelineEvent[]) => {
    const ids = new Set(incoming.map((e) => e.id));
    return sortByDate([...events.filter((e) => !ids.has(e.id)), ...incoming]);
  };
  const showLayer = (layers: Layer[], layerId: string) => layers.map((l) => (l.id === layerId ? { ...l, visible: true } : l));

  // ─── Events ─────────────────────────────────────────────────────────

  const createEvent = useCallback(async (fields: EventFields) => {
    const created = await track(() => api.post<TimelineEvent>("/api/events", { timelineId, ...fields }));
    const layer = data?.layers.find((l) => l.id === created.layerId);
    if (layer && !layer.visible) {
      void api.patch(`/api/layers/${layer.id}`, { visible: true }).catch(() => undefined);
    }
    patchData((d) => ({ ...d, events: upsertEvents(d.events, [created]), layers: showLayer(d.layers, created.layerId) }));
    setHistory((h) => record(h, { kind: "create", label: `Add "${created.title}"`, event: created }));
    return created;
  }, [data?.layers, patchData, timelineId, track]);

  const updateEvent = useCallback(async (id: string, fields: EventFields) => {
    const before = data?.events.find((e) => e.id === id);
    const updated = await track(() => api.patch<TimelineEvent>(`/api/events/${id}`, fields));
    patchData((d) => ({ ...d, events: upsertEvents(d.events, [updated]) }));
    if (before) setHistory((h) => record(h, { kind: "update", label: `Edit "${updated.title}"`, before, after: updated }));
    return updated;
  }, [data?.events, patchData, track]);

  const deleteEvent = useCallback(async (id: string) => {
    const event = data?.events.find((e) => e.id === id);
    await track(() => api.delete("/api/events", { ids: [id] }));
    patchData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    if (event) setHistory((h) => record(h, { kind: "delete", label: `Delete "${event.title}"`, events: [event] }));
  }, [data?.events, patchData, track]);

  const applyImport = useCallback((result: ImportResult) => {
    patchData((d) => ({ ...d, layers: [...d.layers, ...result.createdLayers], events: upsertEvents(d.events, result.created) }));
    if (result.created.length > 0) {
      setHistory((h) => record(h, { kind: "import", label: `Import ${result.created.length} events`, events: result.created }));
    }
  }, [patchData]);

  // ─── Timeline ───────────────────────────────────────────────────────

  const updateTimeline = useCallback(async (patch: TimelinePatch, recordRename = false) => {
    const beforeName = data?.timeline.name;
    const updated = await track(() => api.patch<TimelineDetail>(`/api/timelines/${timelineId}`, patch));
    patchData((d) => ({ ...d, timeline: { ...updated, eventCount: d.events.length } }));
    if (recordRename && beforeName !== undefined && patch.name !== undefined && patch.name !== beforeName) {
      setHistory((h) => record(h, { kind: "rename", label: `Rename to "${patch.name}"`, before: beforeName, after: patch.name! }));
    }
    return updated;
  }, [data?.timeline.name, patchData, timelineId, track]);

  // ─── Layers ─────────────────────────────────────────────────────────

  const createLayer = useCallback(async (name: string, color: string) => {
    const layer = await track(() => api.post<Layer>("/api/layers", { timelineId, name, color }));
    patchData((d) => ({ ...d, layers: [...d.layers, layer] }));
    return layer;
  }, [patchData, timelineId, track]);

  const updateLayer = useCallback(async (id: string, patch: Partial<Pick<Layer, "name" | "color" | "visible">>) => {
    const layer = await track(() => api.patch<Layer>(`/api/layers/${id}`, patch));
    patchData((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...layer, eventCount: l.eventCount } : l)) }));
    return layer;
  }, [patchData, track]);

  /**
   * Layer visibility and order update the screen at once and are saved in the
   * background, one request at a time with only the latest state sent, so
   * quick toggles cannot reach the server out of order. On failure the studio
   * reloads from the server. Resolves to whether the save succeeded.
   */
  const layerSync = useRef<{ running: boolean; queued: { path: string; body: unknown; failure: string } | null; waiters: Array<(ok: boolean) => void> }>({ running: false, queued: null, waiters: [] });

  const syncLayers = useCallback((path: string, body: unknown, failure: string) => {
    const sync = layerSync.current;
    sync.queued = { path, body, failure };
    const done = new Promise<boolean>((resolve) => sync.waiters.push(resolve));
    if (!sync.running) {
      sync.running = true;
      void (async () => {
        let ok = true;
        while (sync.queued) {
          const next = sync.queued;
          sync.queued = null;
          const result = await attempt(() => api.post(next.path, next.body), next.failure);
          if (result === undefined) ok = false;
        }
        sync.running = false;
        if (!ok) await load();
        for (const resolve of sync.waiters.splice(0)) resolve(ok);
      })();
    }
    return done;
  }, [attempt, load]);

  const setVisibleLayers = useCallback((visibleIds: string[]) => {
    const visible = new Set(visibleIds);
    patchData((d) => ({ ...d, layers: d.layers.map((l) => ({ ...l, visible: visible.has(l.id) })) }));
    return syncLayers("/api/layers/visibility", { timelineId, visibleIds }, "Could not save layer visibility");
  }, [patchData, syncLayers, timelineId]);

  const reorderLayers = useCallback((orderedIds: string[]) => {
    const position = new Map(orderedIds.map((id, i) => [id, i]));
    patchData((d) => ({
      ...d,
      layers: [...d.layers].map((l) => ({ ...l, position: position.get(l.id) ?? l.position })).sort((a, b) => a.position - b.position),
    }));
    return syncLayers("/api/layers/reorder", { timelineId, orderedIds }, "Could not save the new layer order");
  }, [patchData, syncLayers, timelineId]);

  const deleteLayer = useCallback(async (id: string, mode: "move-to-default" | "delete-events") => {
    const result = await track(() => api.delete<LayerDeleteResult>(`/api/layers/${id}`, { mode }));
    patchData((d) => ({
      ...d,
      layers: d.layers.filter((l) => l.id !== id),
      events:
        mode === "delete-events"
          ? d.events.filter((e) => e.layerId !== id)
          : d.events.map((e) => (e.layerId === id ? { ...e, layerId: result.movedToLayerId ?? e.layerId } : e)),
    }));
    // Older history entries may still point at this layer; send them to General.
    const defaultLayerId = data?.layers.find((l) => l.isDefault)?.id;
    setHistory((h) => {
      const remaining = mode === "delete-events" ? forgetEvents(h, new Set(result.deletedEventIds)) : h;
      const target = result.movedToLayerId ?? defaultLayerId;
      return target ? moveLayer(remaining, id, target) : remaining;
    });
    return result;
  }, [data?.layers, patchData, track]);

  // ─── Undo / redo ────────────────────────────────────────────────────

  const perform = useCallback(async (op: HistoryOperation) => {
    switch (op.type) {
      case "delete-events": {
        await api.delete("/api/events", { ids: op.ids });
        const ids = new Set(op.ids);
        patchData((d) => ({ ...d, events: d.events.filter((e) => !ids.has(e.id)) }));
        return;
      }
      case "restore-events": {
        const restored = await api.post<TimelineEvent[]>("/api/events/restore", {
          timelineId,
          events: op.events.map((e) => ({ id: e.id, ...eventFields(e) })),
        });
        patchData((d) => ({ ...d, events: upsertEvents(d.events, restored) }));
        return;
      }
      case "update-event": {
        const updated = await api.patch<TimelineEvent>(`/api/events/${op.id}`, op.fields);
        patchData((d) => ({ ...d, events: upsertEvents(d.events, [updated]) }));
        return;
      }
      case "rename-timeline": {
        const updated = await api.patch<TimelineDetail>(`/api/timelines/${timelineId}`, { name: op.name });
        patchData((d) => ({ ...d, timeline: { ...updated, eventCount: d.events.length } }));
        return;
      }
    }
  }, [patchData, timelineId]);

  const step = useCallback(async (direction: "undo" | "redo") => {
    const action: HistoryAction | undefined = (direction === "undo" ? history.undo : history.redo).at(-1);
    if (!action || historyBusy.current) return;
    if (pending > 0) {
      toast.show("Wait a moment: the last change is still saving.", { duration: 2500 });
      return;
    }
    historyBusy.current = true;
    try {
      await track(() => perform(direction === "undo" ? undoOperation(action) : redoOperation(action)));
      setHistory((h) => (direction === "undo" ? afterUndo(h, action) : afterRedo(h, action)));
      toast.show(`${direction === "undo" ? "Undid" : "Redid"}: ${action.label}`, { duration: 3000 });
    } catch (error) {
      const gone = error instanceof ApiRequestError && (error.status === 404 || error.status === 400);
      if (gone) setHistory((h) => discard(h, action));
      toast.error(`Could not ${direction} "${action.label}"`, {
        description: gone ? "The item it refers to no longer exists, so this step was removed." : errorMessage(error),
      });
    } finally {
      historyBusy.current = false;
    }
  }, [history, pending, perform, toast, track]);

  const saveState: SaveState = pending > 0 ? "saving" : lastFailed ? "error" : "saved";

  return {
    data, loadError, reload: load, saveState, history, attempt,
    createEvent, updateEvent, deleteEvent, applyImport,
    updateTimeline,
    createLayer, updateLayer, setVisibleLayers, reorderLayers, deleteLayer,
    undo: () => step("undo"),
    redo: () => step("redo"),
  };
}

export type Studio = ReturnType<typeof useStudio>;

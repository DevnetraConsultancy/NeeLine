"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TimelineRenderer, { LayerItem, TimelineRendererHandle } from "@/components/TimelineRenderer";
import EventForm, { EventFormData } from "@/components/EventForm";
import TimelineSettings from "@/components/TimelineSettings";
import ConfirmModal from "@/components/ConfirmModal";
import ImportModal from "@/components/ImportModal";
import JsonSchemaModal from "@/components/JsonSchemaModal";
import ChronicleNotesModal from "@/components/ChronicleNotesModal";
import { exportTimelineAsPng, exportTimelineAsTxt } from "@/components/PngExport";
import {
  ChevronLeft,
  Plus,
  Settings2,
  Download,
  Upload,
  Image as ImageIcon,
  FileText,
  Calendar,
  CheckCircle2,
  Edit2,
  Code,
  Undo2,
  Redo2,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";

export type HistoryAction =
  | {
      type: "ADD_EVENT";
      description: string;
      event: EventData;
    }
  | {
      type: "EDIT_EVENT";
      description: string;
      eventId: string;
      before: EventData;
      after: EventData;
    }
  | {
      type: "DELETE_EVENT";
      description: string;
      event: EventData;
    }
  | {
      type: "RENAME_TIMELINE";
      description: string;
      before: string;
      after: string;
    }
  | {
      type: "SETTINGS";
      description: string;
      before: {
        bgColor: string;
        spineColor: string;
        tickColor: string;
        textColor: string;
      };
      after: {
        bgColor: string;
        spineColor: string;
        tickColor: string;
        textColor: string;
      };
    }
  | {
      type: "IMPORT_EVENTS";
      description: string;
      events: EventData[];
    };

interface EventData {
  id: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  endYear?: number | null;
  endIsBce?: boolean | null;
  endMonth?: number | null;
  endDay?: number | null;
  title: string;
  description: string | null;
  color: string;
  layer?: string | null;
}

interface TimelineData {
  id: string;
  name: string;
  description?: string | null;
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
}

const DEFAULT_LAYERS: LayerItem[] = [
  { id: "layer-general", name: "General", color: "#c9a84c" },
];

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.id as string;

  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [layers, setLayers] = useState<LayerItem[]>(DEFAULT_LAYERS);
  const [activeLayerNames, setActiveLayerNames] = useState<string[]>(["General"]);
  const [loading, setLoading] = useState(true);

  // Modal and custom states
  const rendererRef = useRef<TimelineRendererHandle>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChronicleNotes, setShowChronicleNotes] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJsonSchemaModal, setShowJsonSchemaModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showGapBorder, setShowGapBorder] = useState(true);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Canvas floating HUD controls visibility toggle (Eye toggle)
  const [showCanvasControls, setShowCanvasControls] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem("neeline_canvas_controls");
    if (saved !== null) {
      setShowCanvasControls(saved !== "false");
    }
  }, []);

  const toggleCanvasControls = useCallback(() => {
    setShowCanvasControls((prev) => {
      const next = !prev;
      localStorage.setItem("neeline_canvas_controls", String(next));
      return next;
    });
  }, []);

  // Undo / Redo History Stacks (MS Word Style)
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [isHistoryBusy, setIsHistoryBusy] = useState(false);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!historyNotice) return;
    const timer = setTimeout(() => setHistoryNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [historyNotice]);

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack((prev) => [...prev.slice(-49), action]); // preserve up to 50 actions
    setRedoStack([]); // standard MS Word behavior: clear redo stack on new operation
  }, []);

  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize global theme changes with canvas
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const getTheme = () =>
      (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setCurrentTheme(getTheme());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setCurrentTheme(customEvent.detail);
      }
    };

    window.addEventListener("neeline_theme_change", handleThemeChange);
    return () => window.removeEventListener("neeline_theme_change", handleThemeChange);
  }, []);

  // Load gap border preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("neeline_gap_border");
    if (saved !== null) {
      setShowGapBorder(saved === "true");
    }
  }, []);

  const handleToggleGapBorder = useCallback((show: boolean) => {
    setShowGapBorder(show);
    localStorage.setItem("neeline_gap_border", String(show));
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportMenu]);

  // Fetch timeline, events, and layers
  const fetchData = useCallback(async () => {
    try {
      const [timelinesRes, eventsRes, layersRes] = await Promise.all([
        fetch(`/api/timelines`),
        fetch(`/api/events?timelineId=${timelineId}`),
        fetch(`/api/layers?timelineId=${timelineId}`),
      ]);

      if (!timelinesRes.ok || !eventsRes.ok) {
        router.push("/dashboard");
        return;
      }

      const timelines = await timelinesRes.json();
      const found = timelines.find((t: TimelineData) => t.id === timelineId);
      if (!found) {
        router.push("/dashboard");
        return;
      }

      const desc =
        found.description ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`neeline_desc_${timelineId}`)
          : null);
      setTimeline({ ...found, description: desc });
      setNameValue(found.name);

      // Read deleted layers blacklist from localStorage to prevent resurrection of deleted layers
      const deletedKey = `neeline_deleted_layers_${timelineId}`;
      let deletedSet: string[] = [];
      try {
        const savedDeleted = localStorage.getItem(deletedKey);
        if (savedDeleted) {
          deletedSet = JSON.parse(savedDeleted);
        }
      } catch {
        deletedSet = [];
      }

      const rawFetchedEvents: EventData[] = await eventsRes.json();
      // Purge any events belonging to deleted layers
      const fetchedEvents: EventData[] = rawFetchedEvents.filter((ev) => {
        const lyr = ((ev.layer && ev.layer.trim()) || "General").toLowerCase();
        return !deletedSet.includes(lyr);
      });
      setEvents(fetchedEvents);

      // Process layers from server, excluding any deleted layers
      let fetchedLayers: LayerItem[] = [];
      if (layersRes.ok) {
        try {
          const rawServerLayers: LayerItem[] = await layersRes.json();
          fetchedLayers = rawServerLayers.filter(
            (l) => !deletedSet.includes(l.name.trim().toLowerCase())
          );
        } catch {
          fetchedLayers = [];
        }
      }

      // Check localStorage for offline/cached layers, excluding deleted layers
      const cachedLayersKey = `neeline_layers_${timelineId}`;
      const savedLayers = localStorage.getItem(cachedLayersKey);
      if (savedLayers) {
        try {
          const parsed = JSON.parse(savedLayers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map<string, LayerItem>();
            parsed
              .filter((l: LayerItem) => !deletedSet.includes(l.name.trim().toLowerCase()))
              .forEach((l: LayerItem) => map.set(l.name.trim().toLowerCase(), l));
            fetchedLayers.forEach((l: LayerItem) => map.set(l.name.trim().toLowerCase(), l));
            fetchedLayers = Array.from(map.values());
          }
        } catch {
          // ignore corrupted cache
        }
      }

      // Fallback: ensure General layer exists
      if (!fetchedLayers.some((l) => l.name.toLowerCase() === "general")) {
        fetchedLayers.unshift({ id: "layer-general", name: "General", color: "#c9a84c" });
      }

      // Dynamically discover all distinct layers present across sanitized fetchedEvents
      const distinctEventLayers = new Set<string>();
      fetchedEvents.forEach((ev) => {
        const lyr = (ev.layer && ev.layer.trim()) || "General";
        if (!deletedSet.includes(lyr.toLowerCase())) {
          distinctEventLayers.add(lyr);
        }
      });

      // Register any event layers in fetchedLayers if not already present
      distinctEventLayers.forEach((layerName) => {
        if (!fetchedLayers.some((l) => l.name.toLowerCase() === layerName.toLowerCase())) {
          const sampleEvent = fetchedEvents.find(
            (ev) => ((ev.layer && ev.layer.trim()) || "General").toLowerCase() === layerName.toLowerCase()
          );
          fetchedLayers.push({
            id: `layer-${layerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: layerName,
            color: (sampleEvent && sampleEvent.color && sampleEvent.color.startsWith("#")) ? sampleEvent.color : "#38bdf8",
          });
        }
      });

      // Final filter to ensure no deleted layer slips through
      fetchedLayers = fetchedLayers.filter(
        (l) => !deletedSet.includes(l.name.trim().toLowerCase())
      );

      // Persist clean sanitized layers back to localStorage
      localStorage.setItem(cachedLayersKey, JSON.stringify(fetchedLayers));
      setLayers(fetchedLayers);

      // Restore active layers preference
      const savedActiveKey = `neeline_active_layers_${timelineId}`;
      const savedActive = localStorage.getItem(savedActiveKey);
      if (savedActive) {
        try {
          const parsed = JSON.parse(savedActive);
          if (Array.isArray(parsed)) {
            const validActive = parsed.filter(
              (n: string) => !deletedSet.includes(n.trim().toLowerCase())
            );
            setActiveLayerNames(validActive.length > 0 ? validActive : ["General"]);
          } else {
            setActiveLayerNames(fetchedLayers.map((l) => l.name));
          }
        } catch {
          setActiveLayerNames(fetchedLayers.map((l) => l.name));
        }
      } else {
        setActiveLayerNames(fetchedLayers.map((l) => l.name));
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [timelineId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle single layer visibility (case-insensitive)
  const handleToggleLayer = useCallback(
    (name: string) => {
      setActiveLayerNames((prev) => {
        const target = name.trim().toLowerCase();
        const exists = prev.some((l) => l.trim().toLowerCase() === target);
        let updated: string[];
        if (exists) {
          updated = prev.filter((l) => l.trim().toLowerCase() !== target);
        } else {
          updated = [...prev, name];
        }
        localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
        return updated;
      });
    },
    [timelineId]
  );

  // Toggle all layers
  const handleToggleAllLayers = useCallback(
    (all: boolean) => {
      const updated = all ? layers.map((l) => l.name) : [];
      setActiveLayerNames(updated);
      localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
    },
    [layers, timelineId]
  );

  // 1-Click Isolate single layer (hide all other layers)
  const handleIsolateLayer = useCallback(
    (name: string) => {
      const updated = [name];
      setActiveLayerNames(updated);
      localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
    },
    [timelineId]
  );

  // Canvas Colors synchronized with global theme unless explicitly customized
  const canvasColors = useMemo(() => {
    if (!timeline) {
      return {
        bg: currentTheme === "light" ? "#faf8f5" : "#070c16",
        spine: currentTheme === "light" ? "#b47c0e" : "#c9a84c",
        tick: currentTheme === "light" ? "#b47c0e" : "#c9a84c",
        text: currentTheme === "light" ? "#0f172a" : "#f5f0e8",
      };
    }

    const isDefaultDark =
      timeline.bgColor === "#070c16" &&
      timeline.textColor === "#f5f0e8" &&
      timeline.spineColor === "#c9a84c";
    const isDefaultLight =
      (timeline.bgColor === "#fcfbf7" || timeline.bgColor === "#faf8f5" || timeline.bgColor === "#f5f0e8") &&
      (timeline.textColor === "#0f172a" || timeline.textColor === "#1a1a1a");

    if (isDefaultDark || isDefaultLight) {
      if (currentTheme === "light") {
        return {
          bg: "#faf8f5",
          spine: "#b47c0e",
          tick: "#b47c0e",
          text: "#0f172a",
        };
      } else {
        return {
          bg: "#070c16",
          spine: "#c9a84c",
          tick: "#c9a84c",
          text: "#f5f0e8",
        };
      }
    }

    return {
      bg: timeline.bgColor,
      spine: timeline.spineColor,
      tick: timeline.tickColor,
      text: timeline.textColor,
    };
  }, [timeline, currentTheme]);

  // Create new layer/period
  const handleCreateLayer = useCallback(
    async (name: string, color: string): Promise<LayerItem> => {
      let createdLayer: LayerItem = {
        id: `layer-${Date.now()}`,
        name,
        color,
      };

      // If re-creating a previously deleted layer, un-blacklist it
      try {
        const deletedKey = `neeline_deleted_layers_${timelineId}`;
        const savedDeleted = localStorage.getItem(deletedKey);
        if (savedDeleted) {
          const arr: string[] = JSON.parse(savedDeleted);
          const updated = arr.filter((n) => n.toLowerCase() !== name.trim().toLowerCase());
          localStorage.setItem(deletedKey, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch("/api/layers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timelineId, name, color }),
        });
        if (res.ok) {
          createdLayer = await res.json();
        }
      } catch (err) {
        console.warn("Failed to save layer to backend API, cached locally", err);
      }

      setLayers((prev) => {
        const updated = [...prev.filter((l) => l.name !== name), createdLayer];
        localStorage.setItem(`neeline_layers_${timelineId}`, JSON.stringify(updated));
        return updated;
      });

      setActiveLayerNames((prev) => {
        const updated = prev.includes(name) ? prev : [...prev, name];
        localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
        return updated;
      });

      return createdLayer;
    },
    [timelineId]
  );

  // Delete layer state and execution
  const [layerToDelete, setLayerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingLayer, setDeletingLayer] = useState(false);

  // Triggered when user clicks trash icon in Layers dropdown
  const handleDeleteLayer = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed.toLowerCase() === "general") return;
      setLayerToDelete({ id, name: trimmed });
    },
    []
  );

  const executeDeleteLayer = useCallback(async () => {
    if (!layerToDelete) return;
    const { name } = layerToDelete;
    const lowerName = name.trim().toLowerCase();
    setDeletingLayer(true);

    try {
      const res = await fetch(
        `/api/layers?timelineId=${timelineId}&name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        console.error("Failed to delete layer on backend, status:", res.status);
      }
    } catch (err) {
      console.warn("Failed to delete layer on backend", err);
    } finally {
      setDeletingLayer(false);
      setLayerToDelete(null);
    }

    // 1. Permanently delete all events and periods belonging to this layer from client state
    setEvents((prev) =>
      prev.filter((e) => {
        const currentLyr = ((e.layer && e.layer.trim()) || "General").toLowerCase();
        return currentLyr !== lowerName;
      })
    );

    // 2. Remove from layers state and localStorage
    setLayers((prev) => {
      const updated = prev.filter((l) => l.name.trim().toLowerCase() !== lowerName);
      localStorage.setItem(`neeline_layers_${timelineId}`, JSON.stringify(updated));
      return updated;
    });

    // 3. Remove from activeLayerNames and localStorage, ensure "General" is present
    setActiveLayerNames((prev) => {
      const remaining = prev.filter((n) => n.trim().toLowerCase() !== lowerName);
      if (!remaining.some((n) => n.toLowerCase() === "general")) {
        remaining.unshift("General");
      }
      localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(remaining));
      return remaining;
    });

    // 4. Blacklist deleted layer in localStorage to prevent stale cache resurrection
    try {
      const deletedKey = `neeline_deleted_layers_${timelineId}`;
      const savedDeleted = localStorage.getItem(deletedKey);
      const deletedArr: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
      if (!deletedArr.includes(lowerName)) {
        deletedArr.push(lowerName);
        localStorage.setItem(deletedKey, JSON.stringify(deletedArr));
      }
    } catch {
      // ignore
    }

    // 5. Purge any actions referring to this deleted layer from undo/redo stacks
    setUndoStack((prev) =>
      prev.filter((act) => {
        if ("event" in act && act.event) {
          const l = ((act.event.layer && act.event.layer.trim()) || "General").toLowerCase();
          return l !== lowerName;
        }
        return true;
      })
    );
    setRedoStack((prev) =>
      prev.filter((act) => {
        if ("event" in act && act.event) {
          const l = ((act.event.layer && act.event.layer.trim()) || "General").toLowerCase();
          return l !== lowerName;
        }
        return true;
      })
    );

    setNoticeMessage(`Layer "${name}" and all associated events were permanently deleted.`);
  }, [layerToDelete, timelineId]);

  // Save event (create or update, supports point milestones and horizontal bracket periods)
  const handleSaveEvent = useCallback(
    async (data: EventFormData) => {
      const isEdit = !!data.id;
      const url = isEdit ? `/api/events?id=${data.id}` : "/api/events";
      const method = isEdit ? "PATCH" : "POST";

      const beforeEvent = isEdit ? events.find((e) => e.id === data.id) : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        timelineId,
        year: data.year,
        isBce: data.isBce,
        month: data.month || null,
        day: data.day || null,
        title: data.title,
        description: data.description || null,
        color: data.color,
        layer: data.layer || "General",
        endYear:
          data.isSpan && data.endYear !== undefined && data.endYear !== null && data.endYear !== ""
            ? data.endYear
            : null,
        endIsBce: data.isSpan ? Boolean(data.endIsBce) : null,
        endMonth: data.isSpan && data.endMonth ? data.endMonth : null,
        endDay: data.isSpan && data.endDay ? data.endDay : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved: EventData = await res.json();
        if (isEdit && beforeEvent) {
          pushAction({
            type: "EDIT_EVENT",
            description: `Edited "${saved.title}"`,
            eventId: saved.id,
            before: beforeEvent,
            after: saved,
          });
          setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        } else if (!isEdit) {
          pushAction({
            type: "ADD_EVENT",
            description: `Added "${saved.title}"`,
            event: saved,
          });
          setEvents((prev) => [...prev, saved]);
        }
      }

      // Ensure the layer is un-blacklisted and activated so user immediately sees their new event
      if (data.layer) {
        try {
          const deletedKey = `neeline_deleted_layers_${timelineId}`;
          const savedDeleted = localStorage.getItem(deletedKey);
          if (savedDeleted) {
            const arr: string[] = JSON.parse(savedDeleted);
            const target = data.layer.trim().toLowerCase();
            if (arr.some((n) => n.toLowerCase() === target)) {
              const updated = arr.filter((n) => n.toLowerCase() !== target);
              localStorage.setItem(deletedKey, JSON.stringify(updated));
            }
          }
        } catch {
          // ignore
        }

        if (!activeLayerNames.includes(data.layer)) {
          setActiveLayerNames((prev) => {
            const updated = [...prev, data.layer!];
            localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
            return updated;
          });
        }
      }

      setShowEventForm(false);
      setEditingEvent(null);
      fetchData();
    },
    [timelineId, activeLayerNames, events, pushAction, fetchData]
  );

  // Delete event
  const handleDeleteEvent = useCallback(async () => {
    if (!editingEvent?.id) return;
    const deleted = editingEvent;
    await fetch(`/api/events?id=${deleted.id}`, { method: "DELETE" });
    pushAction({
      type: "DELETE_EVENT",
      description: `Deleted "${deleted.title}"`,
      event: deleted,
    });
    setEvents((prev) => prev.filter((e) => e.id !== deleted.id));
    setShowEventForm(false);
    setEditingEvent(null);
    fetchData();
  }, [editingEvent, pushAction, fetchData]);

  // Save colors
  const handleSaveColors = useCallback(
    async (colors: {
      bgColor: string;
      spineColor: string;
      tickColor: string;
      textColor: string;
    }) => {
      if (!timeline) return;
      const before = {
        bgColor: timeline.bgColor,
        spineColor: timeline.spineColor,
        tickColor: timeline.tickColor,
        textColor: timeline.textColor,
      };
      await fetch(`/api/timelines?id=${timelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colors),
      });
      pushAction({
        type: "SETTINGS",
        description: "Updated canvas colors",
        before,
        after: colors,
      });
      setTimeline((prev) => (prev ? { ...prev, ...colors } : null));
      fetchData();
    },
    [timeline, timelineId, pushAction, fetchData]
  );

  // Rename timeline
  const handleRename = useCallback(async () => {
    if (!nameValue.trim() || nameValue === timeline?.name) {
      setNameValue(timeline?.name || "");
      setEditingName(false);
      return;
    }
    const before = timeline?.name || "";
    const after = nameValue.trim();
    await fetch(`/api/timelines?id=${timelineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: after }),
    });
    pushAction({
      type: "RENAME_TIMELINE",
      description: `Renamed to "${after}"`,
      before,
      after,
    });
    setTimeline((prev) => (prev ? { ...prev, name: after } : null));
    setEditingName(false);
    fetchData();
  }, [nameValue, timeline?.name, timelineId, pushAction, fetchData]);

  // Undo handler (MS Word Style)
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0 || isHistoryBusy) return;
    setIsHistoryBusy(true);

    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    try {
      if (action.type === "ADD_EVENT") {
        await fetch(`/api/events?id=${action.event.id}`, { method: "DELETE" });
        setEvents((prev) => prev.filter((e) => e.id !== action.event.id));
        setHistoryNotice(`Undid: ${action.description}`);
      } else if (action.type === "EDIT_EVENT") {
        const body = {
          timelineId,
          year: action.before.year,
          isBce: action.before.isBce,
          month: action.before.month,
          day: action.before.day,
          title: action.before.title,
          description: action.before.description,
          color: action.before.color,
          layer: action.before.layer || "General",
          endYear: action.before.endYear || null,
          endIsBce: action.before.endIsBce || null,
          endMonth: action.before.endMonth || null,
          endDay: action.before.endDay || null,
        };
        await fetch(`/api/events?id=${action.eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setEvents((prev) =>
          prev.map((e) => (e.id === action.eventId ? action.before : e))
        );
        setHistoryNotice(`Undid: ${action.description}`);
      } else if (action.type === "DELETE_EVENT") {
        const body = {
          timelineId,
          year: action.event.year,
          isBce: action.event.isBce,
          month: action.event.month,
          day: action.event.day,
          title: action.event.title,
          description: action.event.description,
          color: action.event.color,
          layer: action.event.layer || "General",
          endYear: action.event.endYear || null,
          endIsBce: action.event.endIsBce || null,
          endMonth: action.event.endMonth || null,
          endDay: action.event.endDay || null,
        };
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const recreated: EventData = await res.json();
          action.event = recreated;
          setEvents((prev) => [...prev, recreated]);
        }
        setHistoryNotice(`Undid: ${action.description}`);
      } else if (action.type === "RENAME_TIMELINE") {
        await fetch(`/api/timelines?id=${timelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: action.before }),
        });
        setTimeline((prev) => (prev ? { ...prev, name: action.before } : null));
        setNameValue(action.before);
        setHistoryNotice(`Undid: ${action.description}`);
      } else if (action.type === "SETTINGS") {
        await fetch(`/api/timelines?id=${timelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.before),
        });
        setTimeline((prev) => (prev ? { ...prev, ...action.before } : null));
        setHistoryNotice(`Undid: ${action.description}`);
      } else if (action.type === "IMPORT_EVENTS") {
        const ids = action.events.map((e) => e.id);
        await fetch("/api/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const idSet = new Set(ids);
        setEvents((prev) => prev.filter((e) => !idSet.has(e.id)));
        setHistoryNotice(`Undid: ${action.description}`);
      }

      setRedoStack((prev) => [...prev, action]);
    } catch (err) {
      console.error("Undo error:", err);
    } finally {
      setIsHistoryBusy(false);
    }
  }, [undoStack, isHistoryBusy, timelineId]);

  // Redo handler (MS Word Style)
  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0 || isHistoryBusy) return;
    setIsHistoryBusy(true);

    const action = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    try {
      if (action.type === "ADD_EVENT") {
        const body = {
          timelineId,
          year: action.event.year,
          isBce: action.event.isBce,
          month: action.event.month,
          day: action.event.day,
          title: action.event.title,
          description: action.event.description,
          color: action.event.color,
          layer: action.event.layer || "General",
          endYear: action.event.endYear || null,
          endIsBce: action.event.endIsBce || null,
          endMonth: action.event.endMonth || null,
          endDay: action.event.endDay || null,
        };
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const recreated: EventData = await res.json();
          action.event = recreated;
          setEvents((prev) => [...prev, recreated]);
        }
        setHistoryNotice(`Redid: ${action.description}`);
      } else if (action.type === "EDIT_EVENT") {
        const body = {
          timelineId,
          year: action.after.year,
          isBce: action.after.isBce,
          month: action.after.month,
          day: action.after.day,
          title: action.after.title,
          description: action.after.description,
          color: action.after.color,
          layer: action.after.layer || "General",
          endYear: action.after.endYear || null,
          endIsBce: action.after.endIsBce || null,
          endMonth: action.after.endMonth || null,
          endDay: action.after.endDay || null,
        };
        await fetch(`/api/events?id=${action.eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setEvents((prev) =>
          prev.map((e) => (e.id === action.eventId ? action.after : e))
        );
        setHistoryNotice(`Redid: ${action.description}`);
      } else if (action.type === "DELETE_EVENT") {
        await fetch(`/api/events?id=${action.event.id}`, { method: "DELETE" });
        setEvents((prev) => prev.filter((e) => e.id !== action.event.id));
        setHistoryNotice(`Redid: ${action.description}`);
      } else if (action.type === "RENAME_TIMELINE") {
        await fetch(`/api/timelines?id=${timelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: action.after }),
        });
        setTimeline((prev) => (prev ? { ...prev, name: action.after } : null));
        setNameValue(action.after);
        setHistoryNotice(`Redid: ${action.description}`);
      } else if (action.type === "SETTINGS") {
        await fetch(`/api/timelines?id=${timelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.after),
        });
        setTimeline((prev) => (prev ? { ...prev, ...action.after } : null));
        setHistoryNotice(`Redid: ${action.description}`);
      } else if (action.type === "IMPORT_EVENTS") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timelineId,
            events: action.events.map((e) => ({
              title: e.title,
              year: e.year,
              isBce: e.isBce,
              month: e.month,
              day: e.day,
              endYear: e.endYear,
              endIsBce: e.endIsBce,
              endMonth: e.endMonth,
              endDay: e.endDay,
              description: e.description,
              color: e.color,
              layer: e.layer,
            })),
          }),
        });
        if (res.ok) {
          const recreated: EventData[] = await res.json();
          action.events = recreated;
          setEvents((prev) => [...prev, ...recreated]);
        }
        setHistoryNotice(`Redid: ${action.description}`);
      }

      setUndoStack((prev) => [...prev, action]);
    } catch (err) {
      console.error("Redo error:", err);
    } finally {
      setIsHistoryBusy(false);
    }
  }, [redoStack, isHistoryBusy, timelineId]);

  // Global Keyboard Shortcuts (Ctrl+Z for Undo, Ctrl+Y or Ctrl+Shift+Z for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (
        showEventForm ||
        showSettings ||
        showImportModal ||
        showJsonSchemaModal ||
        showChronicleNotes
      ) {
        return;
      }

      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifier = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      if (!isModifier && key === "v") {
        e.preventDefault();
        toggleCanvasControls();
        return;
      }

      if (!isModifier) return;

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (key === "y" && !e.shiftKey) ||
        (key === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    toggleCanvasControls,
    showEventForm,
    showSettings,
    showImportModal,
    showJsonSchemaModal,
    showChronicleNotes,
  ]);

  // Save Chronicle Overview Notes
  const handleSaveChronicleNotes = useCallback(
    async (updatedNotes: string) => {
      try {
        await fetch(`/api/timelines?id=${timelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: updatedNotes }),
        });
        localStorage.setItem(`neeline_desc_${timelineId}`, updatedNotes);
        setTimeline((prev) => (prev ? { ...prev, description: updatedNotes } : null));
        setNoticeMessage("Chronicle notes updated successfully.");
      } catch {
        setNoticeMessage("Failed to save chronicle notes. Please try again.");
      }
    },
    [timelineId]
  );

  // Export as Full JSON Callset
  const handleExportJson = useCallback(() => {
    if (!timeline) return;

    const payload = {
      format: "neeline-chronicle-v1",
      exportedAt: new Date().toISOString(),
      timeline: {
        name: timeline.name,
        description: timeline.description || null,
        bgColor: timeline.bgColor,
        spineColor: timeline.spineColor,
        tickColor: timeline.tickColor,
        textColor: timeline.textColor,
      },
      layers: layers.map((l) => ({ name: l.name, color: l.color })),
      events: events.map((e) => ({
        title: e.title,
        year: e.year,
        isBce: e.isBce,
        month: e.month,
        day: e.day,
        endYear: e.endYear || null,
        endIsBce: e.endIsBce || null,
        endMonth: e.endMonth || null,
        endDay: e.endDay || null,
        color: e.color,
        layer: e.layer || "General",
        description: e.description,
      })),
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${timeline.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-chronicle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [timeline, layers, events]);

  // Export as 2x Retina PNG (Automatically fits entire viewport and all events!)
  const handleExportPng = useCallback(() => {
    if (!timeline) return;
    setShowExportMenu(false);
    const filename = `${timeline.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-full-chronicle.png`;
    if (rendererRef.current) {
      rendererRef.current.exportPng(filename);
    } else {
      const svgEl = document.getElementById("timeline-canvas-svg") as SVGSVGElement | null;
      if (svgEl) {
        exportTimelineAsPng(svgEl, canvasColors.bg || timeline.bgColor, filename);
      }
    }
  }, [timeline, canvasColors.bg]);

  // Export as Tabular Plain Text
  const handleExportTxt = useCallback(() => {
    if (!timeline) return;
    const filename = `${timeline.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-events.txt`;
    exportTimelineAsTxt(events, filename);
    setShowExportMenu(false);
  }, [events, timeline]);

  // Stats for Chronicle Notes Modal
  const spanCount = useMemo(
    () => events.filter((e) => e.endYear !== undefined && e.endYear !== null).length,
    [events]
  );

  const { earliestDate, latestDate } = useMemo(() => {
    if (events.length === 0) return { earliestDate: undefined, latestDate: undefined };
    const allPoints: Array<{ year: number; isBce: boolean; num: number }> = [];
    events.forEach((e) => {
      const safeY = Math.abs(e.year);
      allPoints.push({
        year: safeY,
        isBce: e.isBce,
        num: e.isBce ? -safeY : safeY,
      });
      if (e.endYear !== undefined && e.endYear !== null) {
        const safeEy = Math.abs(e.endYear);
        const endBce = Boolean(e.endIsBce);
        allPoints.push({
          year: safeEy,
          isBce: endBce,
          num: endBce ? -safeEy : safeEy,
        });
      }
    });

    allPoints.sort((a, b) => a.num - b.num);
    const earliest = allPoints[0];
    const latest = allPoints[allPoints.length - 1];
    return {
      earliestDate: `${earliest.year.toLocaleString()} ${earliest.isBce ? "BCE" : "CE"}`,
      latestDate: `${latest.year.toLocaleString()} ${latest.isBce ? "BCE" : "CE"}`,
    };
  }, [events]);

  if (loading || !timeline) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
          <span className="text-xs font-mono theme-text-muted">Loading Chronicle Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen theme-bg overflow-hidden select-none relative flex flex-col">
      <Navbar />

      {/* Studio Header Bar (Top 2nd Bar: Sleeker, compact ribbon) */}
      <div className="fixed top-14 left-0 right-0 h-11 px-3 sm:px-6 z-40 border-b border-black/[0.08] dark:border-white/[0.08] glass-panel flex items-center justify-between gap-2.5">
        {/* Left Side: Back button, Name edit & Event counter & Chronicle Notes */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            className="w-8 h-8 rounded-lg theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center shrink-0 transition-colors"
            title="Return to Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          {/* Timeline Name inline editable */}
          {editingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setNameValue(timeline.name);
                  setEditingName(false);
                }
              }}
              onBlur={handleRename}
              className="px-2 py-0.5 rounded-lg theme-input text-xs sm:text-sm font-semibold outline-none min-w-0 border border-[#c9a84c]"
              style={{ fontFamily: "var(--font-display)" }}
            />
          ) : (
            <div
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 group/edit cursor-pointer py-1 px-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors min-w-0"
              title="Click to rename"
            >
              <h1
                className="text-xs sm:text-sm font-semibold truncate theme-card-title group-hover/edit:text-[#c9a84c] transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {timeline.name}
              </h1>
              <Edit2 className="w-3 h-3 opacity-40 group-hover/edit:text-[#c9a84c] group-hover/edit:opacity-100 transition-all shrink-0" />
            </div>
          )}

          {/* Event count chip */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full theme-pill text-[10px] font-mono text-[#c9a84c] font-semibold">
            <Calendar className="w-3 h-3" />
            <span>
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          </span>
        </div>

        {/* Right Studio Action Icons: Undo/Redo -> Import/Export -> Canvas Settings -> Eye Toggle -> Add Event */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Undo / Redo MS Word Style Segmented Control */}
          <div
            className="flex items-center rounded-lg theme-pill p-0.5 border border-black/10 dark:border-white/10"
            role="group"
            aria-label="Undo and Redo"
          >
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || isHistoryBusy}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                undoStack.length > 0 && !isHistoryBusy
                  ? "hover:text-[#c9a84c] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-slate-700 dark:text-slate-200"
                  : "opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600"
              }`}
              title={
                undoStack.length > 0
                  ? `Undo: ${undoStack[undoStack.length - 1].description} (Ctrl+Z)`
                  : "Undo (Ctrl+Z)"
              }
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-black/10 dark:bg-white/10" />
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0 || isHistoryBusy}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                redoStack.length > 0 && !isHistoryBusy
                  ? "hover:text-[#c9a84c] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-slate-700 dark:text-slate-200"
                  : "opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600"
              }`}
              title={
                redoStack.length > 0
                  ? `Redo: ${redoStack[redoStack.length - 1].description} (Ctrl+Y or Ctrl+Shift+Z)`
                  : "Redo (Ctrl+Y or Ctrl+Shift+Z)"
              }
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Import / Export Small Icon Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-8 h-8 rounded-lg theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center cursor-pointer transition-all"
              title="Import & Export (JSON callset, PNG image, Schema, TXT)"
              aria-label="Import & Export"
            >
              <Download className="w-3.5 h-3.5 text-[#c9a84c]" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 border border-black/10 dark:border-white/[0.1]">
                {/* Option 1: Import as JSON (with Layer Option) */}
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowImportModal(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono theme-card-title"
                  title="Import timeline events with layer routing options"
                >
                  <Upload className="w-3.5 h-3.5 text-[#5a9bd5]" />
                  <span>Import as JSON...</span>
                </button>

                {/* Option 2: Export as JSON */}
                <button
                  onClick={handleExportJson}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono theme-card-title"
                  title="Export complete chronicle callset as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Export as JSON</span>
                </button>

                <div className="h-px bg-black/[0.08] dark:bg-white/[0.06] my-1" />

                {/* Option 3: Export 2x Retina PNG (Fit Viewport, All Events) */}
                <button
                  onClick={handleExportPng}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono theme-card-title"
                  title="Fit canvas to all events and export high-resolution 2x Retina PNG image"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Export 2x Retina PNG</span>
                </button>

                {/* Option 4: Export Tabular TXT */}
                <button
                  onClick={handleExportTxt}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono theme-card-title"
                  title="Export chronological events as tabular plain text"
                >
                  <FileText className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Export Tabular TXT</span>
                </button>

                <div className="h-px bg-black/[0.08] dark:bg-white/[0.06] my-1" />

                {/* Option 5: JSON Schema & Template Spec */}
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowJsonSchemaModal(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono text-[#c9a84c]"
                  title="View JSON format specification and download starter template"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Import JSON Schema</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Canvas Settings Small Icon Button (Beside Import/Export on the right) */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center cursor-pointer relative transition-all"
            title="Canvas Settings (Colors, Theme & Gap Year Borders)"
            aria-label="Canvas Settings"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#c9a84c]" />
            <div
              className="w-1.5 h-1.5 rounded-full absolute bottom-1.5 right-1.5 ring-1 ring-black/20 dark:ring-[#070c16]"
              style={{ backgroundColor: timeline.spineColor }}
            />
          </button>

          {/* 3. Eye Toggle: Vanish / Show all buttons above canvas area */}
          <button
            type="button"
            onClick={toggleCanvasControls}
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              !showCanvasControls
                ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 shadow-sm"
                : "theme-pill hover:border-[#c9a84c]/40 text-slate-600 dark:text-slate-300 hover:text-[#c9a84c]"
            }`}
            title={
              showCanvasControls
                ? "Vanish all buttons above canvas area (Zen View - Key: V)"
                : "Show all buttons above canvas area (Key: V)"
            }
            aria-label={
              showCanvasControls
                ? "Vanish all buttons above canvas area"
                : "Show all buttons above canvas area"
            }
          >
            {showCanvasControls ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-[#c9a84c]" />
            )}
          </button>

          {/* 4. Add Event Small Icon Button (Beside Eye Toggle on the right) */}
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            className="btn-gold w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shadow-md"
            title="Add Chronicle Milestone or Bracketed Period"
            aria-label="Add Chronicle Milestone"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area: Fixed between top studio header and bottom footer */}
      <div className="absolute inset-x-0 top-[100px] bottom-[36px] overflow-hidden">
        <TimelineRenderer
          ref={rendererRef}
          events={events}
          bgColor={canvasColors.bg}
          spineColor={canvasColors.spine}
          tickColor={canvasColors.tick}
          textColor={canvasColors.text}
          showGapBorder={showGapBorder}
          layers={layers}
          activeLayerNames={activeLayerNames}
          showCanvasControls={showCanvasControls}
          onToggleLayer={handleToggleLayer}
          onToggleAllLayers={handleToggleAllLayers}
          onIsolateLayer={handleIsolateLayer}
          onCreateLayer={handleCreateLayer}
          onDeleteLayer={handleDeleteLayer}
          onEventClick={(event) => {
            setEditingEvent(event);
            setShowEventForm(true);
          }}
        />
      </div>

      {/* Event Add/Edit Modal: Supports Point Milestones & Horizontal Bracket Spans */}
      {showEventForm && (
        <EventForm
          key={editingEvent?.id ? `edit-${editingEvent.id}` : "new-event"}
          initialData={
            editingEvent
              ? {
                  id: editingEvent.id || undefined,
                  year: editingEvent.year,
                  isBce: editingEvent.isBce,
                  month: editingEvent.month?.toString() || "",
                  day: editingEvent.day?.toString() || "",
                  title: editingEvent.title,
                  description: editingEvent.description || "",
                  color: editingEvent.color,
                  layer: editingEvent.layer || "General",
                  isSpan: Boolean(
                    editingEvent.endYear !== undefined &&
                    editingEvent.endYear !== null &&
                    String(editingEvent.endYear).trim() !== ""
                  ),
                  endYear:
                    editingEvent.endYear !== undefined &&
                    editingEvent.endYear !== null &&
                    String(editingEvent.endYear).trim() !== ""
                      ? String(editingEvent.endYear)
                      : null,
                  endIsBce: editingEvent.endIsBce || false,
                  endMonth: editingEvent.endMonth ? String(editingEvent.endMonth) : "",
                  endDay: editingEvent.endDay ? String(editingEvent.endDay) : "",
                }
              : undefined
          }
          existingEvents={events}
          availableLayers={layers}
          onCreateLayer={handleCreateLayer}
          onSave={handleSaveEvent}
          onDelete={editingEvent?.id ? handleDeleteEvent : undefined}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Canvas Settings Modal */}
      {showSettings && (
        <TimelineSettings
          bgColor={canvasColors.bg}
          spineColor={canvasColors.spine}
          tickColor={canvasColors.tick}
          textColor={canvasColors.text}
          showGapBorder={showGapBorder}
          onToggleGapBorder={handleToggleGapBorder}
          onSave={handleSaveColors}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Chronicle Overview Notes Modal */}
      {timeline && (
        <ChronicleNotesModal
          isOpen={showChronicleNotes}
          timelineName={timeline.name}
          notes={timeline.description || ""}
          eventsCount={events.length}
          spanCount={spanCount}
          layersCount={layers.length}
          earliestDate={earliestDate}
          latestDate={latestDate}
          onSaveNotes={handleSaveChronicleNotes}
          onClose={() => setShowChronicleNotes(false)}
        />
      )}

      {/* Import JSON Modal with Layer Option */}
      <ImportModal
        isOpen={showImportModal}
        timelineId={timelineId}
        availableLayers={layers}
        onImportComplete={(count, newLayer, createdEvents) => {
          if (newLayer) {
            setLayers((prev) => [...prev, newLayer]);
            setActiveLayerNames((prev) => [...prev, newLayer.name]);
          }
          if (createdEvents && createdEvents.length > 0) {
            pushAction({
              type: "IMPORT_EVENTS",
              description: `Import ${count} events`,
              events: createdEvents,
            });
          }
          fetchData();
          setNoticeMessage(`Successfully imported ${count} events into the chronicle.`);
        }}
        onClose={() => setShowImportModal(false)}
      />

      {/* JSON Schema & Template Spec Modal */}
      <JsonSchemaModal
        isOpen={showJsonSchemaModal}
        onClose={() => setShowJsonSchemaModal(false)}
      />

      {/* Confirmation Modal for Layer Deletion */}
      <ConfirmModal
        isOpen={layerToDelete !== null}
        title="Delete Historical Period Layer"
        message={
          layerToDelete
            ? `Are you sure you want to delete the "${layerToDelete.name}" layer? All milestones and bracket span periods belonging to this layer will be permanently deleted from the database.`
            : ""
        }
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deletingLayer}
        onConfirm={executeDeleteLayer}
        onClose={() => {
          if (!deletingLayer) setLayerToDelete(null);
        }}
      />

      {/* In-Viewport Notification / Error Modal */}
      <ConfirmModal
        isOpen={noticeMessage !== null}
        title="Notice"
        message={noticeMessage || ""}
        confirmLabel="Understood"
        cancelLabel="Close"
        isDestructive={false}
        onConfirm={() => setNoticeMessage(null)}
        onClose={() => setNoticeMessage(null)}
      />

      {/* Studio Micro Footer Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-9 px-6 theme-footer z-40 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </span>
          {historyNotice && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 animate-fade-in font-sans font-medium text-xs">
              <RotateCcw className="w-3 h-3" />
              <span>{historyNotice}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Developed in Collaboration with Academia | Devnetra Consultancy</span>
        </div>
      </div>
    </div>
  );
}

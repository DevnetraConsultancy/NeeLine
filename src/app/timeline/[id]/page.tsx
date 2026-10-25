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
} from "lucide-react";

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

  const exportMenuRef = useRef<HTMLDivElement>(null);

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

      const fetchedEvents: EventData[] = await eventsRes.json();
      setEvents(fetchedEvents);

      // Process layers
      let fetchedLayers: LayerItem[] = [];
      if (layersRes.ok) {
        try {
          fetchedLayers = await layersRes.json();
        } catch {
          fetchedLayers = [];
        }
      }

      // Check localStorage for offline/cached layers
      const cachedLayersKey = `neeline_layers_${timelineId}`;
      const savedLayers = localStorage.getItem(cachedLayersKey);
      if (savedLayers) {
        try {
          const parsed = JSON.parse(savedLayers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map<string, LayerItem>();
            parsed.forEach((l: LayerItem) => map.set(l.name, l));
            fetchedLayers.forEach((l: LayerItem) => map.set(l.name, l));
            fetchedLayers = Array.from(map.values());
          }
        } catch {
          // ignore corrupted cache
        }
      }

      // Fallback: ensure General layer exists
      if (!fetchedLayers.some((l) => l.name === "General")) {
        fetchedLayers.unshift({ id: "layer-general", name: "General", color: "#c9a84c" });
      }

      // Dynamically discover all distinct layers present across fetchedEvents
      const distinctEventLayers = new Set<string>();
      fetchedEvents.forEach((ev) => {
        const lyr = (ev.layer && ev.layer.trim()) || "General";
        distinctEventLayers.add(lyr);
      });

      // Register any event layers in fetchedLayers if not already present
      distinctEventLayers.forEach((layerName) => {
        if (!fetchedLayers.some((l) => l.name.toLowerCase() === layerName.toLowerCase())) {
          fetchedLayers.push({
            id: `layer-${layerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: layerName,
            color: "#c9a84c",
          });
        }
      });

      setLayers(fetchedLayers);

      // Restore active layers preference
      const savedActiveKey = `neeline_active_layers_${timelineId}`;
      const savedActive = localStorage.getItem(savedActiveKey);
      if (savedActive) {
        try {
          const parsed = JSON.parse(savedActive);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge in all layers present in fetchedEvents so events are never hidden accidentally
            const activeSet = new Set<string>(parsed);
            distinctEventLayers.forEach((name) => activeSet.add(name));
            setActiveLayerNames(Array.from(activeSet));
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

  // Toggle single layer visibility
  const handleToggleLayer = useCallback(
    (name: string) => {
      setActiveLayerNames((prev) => {
        let updated: string[];
        if (prev.includes(name)) {
          updated = prev.filter((l) => l !== name);
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

  // Create new layer/period
  const handleCreateLayer = useCallback(
    async (name: string, color: string): Promise<LayerItem> => {
      let createdLayer: LayerItem = {
        id: `layer-${Date.now()}`,
        name,
        color,
      };

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

  // Delete layer
  const handleDeleteLayer = useCallback(
    async (id: string, name: string) => {
      if (name === "General") return;

      try {
        if (id && !id.startsWith("layer-")) {
          await fetch(`/api/layers?id=${id}`, { method: "DELETE" });
        }
      } catch (err) {
        console.warn("Failed to delete layer on backend", err);
      }

      setLayers((prev) => {
        const updated = prev.filter((l) => l.name !== name);
        localStorage.setItem(`neeline_layers_${timelineId}`, JSON.stringify(updated));
        return updated;
      });

      setActiveLayerNames((prev) => {
        const updated = prev.filter((l) => l !== name);
        localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
        return updated;
      });
    },
    [timelineId]
  );

  // Save event (create or update, supports point milestones and horizontal bracket periods)
  const handleSaveEvent = useCallback(
    async (data: EventFormData) => {
      const isEdit = !!data.id;
      const url = isEdit ? `/api/events?id=${data.id}` : "/api/events";
      const method = isEdit ? "PATCH" : "POST";

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

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Ensure the layer is activated so user immediately sees their new event
      if (data.layer && !activeLayerNames.includes(data.layer)) {
        setActiveLayerNames((prev) => {
          const updated = [...prev, data.layer!];
          localStorage.setItem(`neeline_active_layers_${timelineId}`, JSON.stringify(updated));
          return updated;
        });
      }

      setShowEventForm(false);
      setEditingEvent(null);
      fetchData();
    },
    [timelineId, activeLayerNames, fetchData]
  );

  // Delete event
  const handleDeleteEvent = useCallback(async () => {
    if (!editingEvent?.id) return;
    await fetch(`/api/events?id=${editingEvent.id}`, { method: "DELETE" });
    setShowEventForm(false);
    setEditingEvent(null);
    fetchData();
  }, [editingEvent, fetchData]);

  // Save colors
  const handleSaveColors = useCallback(
    async (colors: {
      bgColor: string;
      spineColor: string;
      tickColor: string;
      textColor: string;
    }) => {
      await fetch(`/api/timelines?id=${timelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colors),
      });
      fetchData();
    },
    [timelineId, fetchData]
  );

  // Rename timeline
  const handleRename = useCallback(async () => {
    if (!nameValue.trim() || nameValue === timeline?.name) {
      setNameValue(timeline?.name || "");
      setEditingName(false);
      return;
    }
    await fetch(`/api/timelines?id=${timelineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue.trim() }),
    });
    setEditingName(false);
    fetchData();
  }, [nameValue, timeline?.name, timelineId, fetchData]);

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
        exportTimelineAsPng(svgEl, timeline.bgColor, filename);
      }
    }
  }, [timeline]);

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
    const sorted = [...events].sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      return ya - yb;
    });
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];
    return {
      earliestDate: `${earliest.year} ${earliest.isBce ? "BCE" : "CE"}`,
      latestDate: `${latest.year} ${latest.isBce ? "BCE" : "CE"}`,
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

      {/* Studio Header Bar */}
      <div className="fixed top-14 left-0 right-0 h-14 px-4 sm:px-6 z-40 border-b border-black/[0.08] dark:border-white/[0.08] glass-panel flex items-center justify-between gap-3">
        {/* Left Side: Back button, Name edit & Event counter & Chronicle Notes */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center shrink-0 transition-colors"
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
              className="px-2.5 py-1 rounded-lg theme-input text-sm font-semibold outline-none min-w-0 border border-[#c9a84c]"
              style={{ fontFamily: "var(--font-display)" }}
            />
          ) : (
            <div
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 group/edit cursor-pointer py-1 px-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors min-w-0"
              title="Click to rename"
            >
              <h1
                className="text-sm sm:text-base font-semibold truncate theme-card-title group-hover/edit:text-[#c9a84c] transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {timeline.name}
              </h1>
              <Edit2 className="w-3 h-3 opacity-40 group-hover/edit:text-[#c9a84c] group-hover/edit:opacity-100 transition-all shrink-0" />
            </div>
          )}

          {/* Event count chip */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full theme-pill text-[11px] font-mono text-[#c9a84c] font-semibold">
            <Calendar className="w-3 h-3" />
            <span>
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          </span>
        </div>

        {/* Right Studio Action Icons: Import/Export -> Canvas Settings -> Add Event */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 1. Import / Export Small Icon Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-9 h-9 rounded-xl theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center cursor-pointer transition-all"
              title="Import & Export (JSON callset, PNG image, Schema, TXT)"
              aria-label="Import & Export"
            >
              <Download className="w-4 h-4 text-[#c9a84c]" />
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
            className="w-9 h-9 rounded-xl theme-pill hover:border-[#c9a84c]/50 flex items-center justify-center cursor-pointer relative transition-all"
            title="Canvas Settings (Colors, Theme & Gap Year Borders)"
            aria-label="Canvas Settings"
          >
            <Settings2 className="w-4 h-4 text-[#c9a84c]" />
            <div
              className="w-1.5 h-1.5 rounded-full absolute bottom-1.5 right-1.5 ring-1 ring-black/20 dark:ring-[#070c16]"
              style={{ backgroundColor: timeline.spineColor }}
            />
          </button>

          {/* 3. Add Event Small Icon Button (Beside Canvas Settings on the right) */}
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            className="btn-gold w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shadow-md"
            title="Add Chronicle Milestone or Bracketed Period"
            aria-label="Add Chronicle Milestone"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area: Fixed between top studio header and bottom footer */}
      <div className="absolute inset-x-0 top-[112px] bottom-[36px] overflow-hidden">
        <TimelineRenderer
          ref={rendererRef}
          events={events}
          bgColor={timeline.bgColor}
          spineColor={timeline.spineColor}
          tickColor={timeline.tickColor}
          textColor={timeline.textColor}
          showGapBorder={showGapBorder}
          layers={layers}
          activeLayerNames={activeLayerNames}
          onToggleLayer={handleToggleLayer}
          onToggleAllLayers={handleToggleAllLayers}
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
                  isSpan: Boolean(editingEvent.endYear !== undefined && editingEvent.endYear !== null),
                  endYear: editingEvent.endYear !== undefined && editingEvent.endYear !== null ? String(editingEvent.endYear) : "",
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
          bgColor={timeline.bgColor}
          spineColor={timeline.spineColor}
          tickColor={timeline.tickColor}
          textColor={timeline.textColor}
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
        onImportComplete={(count, newLayer) => {
          if (newLayer) {
            setLayers((prev) => [...prev, newLayer]);
            setActiveLayerNames((prev) => [...prev, newLayer.name]);
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
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Developed in Collaboration with Academia | Devnetra Consultancy</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TimelineRenderer from "@/components/TimelineRenderer";
import EventForm from "@/components/EventForm";
import TimelineSettings from "@/components/TimelineSettings";
import { exportTimelineAsPng, exportTimelineAsTxt } from "@/components/PngExport";
import {
  ChevronLeft,
  Plus,
  Settings2,
  Upload,
  Image as ImageIcon,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
} from "lucide-react";

interface EventData {
  id: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  title: string;
  description: string | null;
  color: string;
}

interface TimelineData {
  id: string;
  name: string;
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
}

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.id as string;

  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // Fetch timeline + events
  const fetchData = useCallback(async () => {
    try {
      const [timelinesRes, eventsRes] = await Promise.all([
        fetch(`/api/timelines`),
        fetch(`/api/events?timelineId=${timelineId}`),
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

      setTimeline(found);
      setNameValue(found.name);
      setEvents(await eventsRes.json());
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [timelineId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add event via click on background
  const handleBgClick = useCallback(
    (year: number, isBce: boolean) => {
      setEditingEvent(null);
      setEditingEvent({
        id: "",
        year,
        isBce,
        month: null,
        day: null,
        title: "",
        description: null,
        color: "#c9a84c",
      });
      setShowEventForm(true);
    },
    []
  );

  // Save event (create or update)
  const handleSaveEvent = useCallback(
    async (data: {
      id?: string;
      year: number;
      isBce: boolean;
      month: string;
      day: string;
      title: string;
      description: string;
      color: string;
    }) => {
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
      };

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setShowEventForm(false);
      setEditingEvent(null);
      fetchData();
    },
    [timelineId, fetchData]
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
  }, [nameValue, timeline, timelineId, fetchData]);

  // JSON upload handler
  const handleJsonUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        const rawItems = Array.isArray(data)
          ? data
          : data && typeof data === "object" && "events" in data && Array.isArray(data.events)
            ? data.events
            : [];
        const items = rawItems.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        );
        for (const item of items) {
          await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timelineId,
              year: typeof item.year === "number" ? item.year : 0,
              isBce: typeof item.isBce === "boolean" ? item.isBce : false,
              month: typeof item.month === "number" ? item.month : null,
              day: typeof item.day === "number" ? item.day : null,
              title: typeof item.title === "string" && item.title ? item.title : "Untitled",
              description: typeof item.description === "string" ? item.description : null,
              color: typeof item.color === "string" && item.color ? item.color : "#c9a84c",
            }),
          });
        }
        fetchData();
      } catch {
        alert("Invalid JSON file. Expected an array of events.");
      } finally {
        setUploading(false);
        if (jsonInputRef.current) jsonInputRef.current.value = "";
      }
    },
    [timelineId, fetchData]
  );

  // PNG export handler
  const handleExportPng = useCallback(() => {
    let svg: SVGSVGElement | null = null;
    let maxArea = 0;
    document.querySelectorAll("svg").forEach((s) => {
      const r = s.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > maxArea) {
        maxArea = area;
        svg = s as SVGSVGElement;
      }
    });
    if (!svg) return;
    exportTimelineAsPng(
      svg,
      timeline?.bgColor || "#070c16",
      `${timeline?.name || "timeline"}.png`
    );
    setShowExportMenu(false);
  }, [timeline]);

  // TXT export handler
  const handleExportTxt = useCallback(() => {
    exportTimelineAsTxt(events, `${timeline?.name || "timeline"}.txt`);
    setShowExportMenu(false);
  }, [events, timeline]);

  if (loading || !timeline) {
    return (
      <div className="h-screen bg-[#070c16] flex flex-col items-center justify-center text-[#f5f0e8]">
        <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono text-[#f5f0e8]/40">Initializing Timeline Studio...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#070c16] flex flex-col overflow-hidden select-none">
      <Navbar />

      {/* Studio Header Sub-bar */}
      <div className="fixed top-14 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 sm:px-8 bg-[#090f1d]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        {/* Left: Breadcrumbs & Editable Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs font-mono text-[#f5f0e8]/40 hover:text-[#c9a84c] transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-white/[0.04]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span className="text-[#f5f0e8]/20 text-xs">/</span>

          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setNameValue(timeline.name);
                  setEditingName(false);
                }
              }}
              onBlur={handleRename}
              className="px-2.5 py-1 rounded-lg bg-[#070c16] border border-[#c9a84c] text-[#f5f0e8] text-sm font-semibold outline-none min-w-0 shadow-inner"
              style={{ fontFamily: "var(--font-display)" }}
            />
          ) : (
            <div
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 group/edit cursor-pointer py-1 px-2 rounded-lg hover:bg-white/[0.04] transition-colors min-w-0"
              title="Click to rename"
            >
              <h1
                className="text-sm sm:text-base font-semibold text-[#f5f0e8] truncate group-hover/edit:text-[#c9a84c] transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {timeline.name}
              </h1>
              <Edit2 className="w-3 h-3 text-[#f5f0e8]/30 group-hover/edit:text-[#c9a84c] transition-colors shrink-0" />
            </div>
          )}

          {/* Event count chip */}
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-[#c9a84c]/80">
            <Calendar className="w-3 h-3" />
            <span>
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          </span>
        </div>

        {/* Right: Studio Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonUpload}
            className="hidden"
          />

          {/* Import & Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={uploading}
              className="h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.1] hover:border-[#c9a84c]/40 text-[#f5f0e8]/80 text-xs font-mono font-medium hover:bg-white/[0.06] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span className="hidden sm:inline">
                {uploading ? "Importing..." : "Data & Export"}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl glass-panel p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    jsonInputRef.current?.click();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-[#f5f0e8]/80 hover:text-[#f5f0e8] hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono"
                >
                  <Upload className="w-3.5 h-3.5 text-[#5a9bd5]" />
                  <span>Import JSON Callset</span>
                </button>

                <div className="h-px bg-white/[0.06] my-1" />

                <button
                  onClick={handleExportPng}
                  className="w-full px-3 py-2 text-left text-xs text-[#f5f0e8]/80 hover:text-[#f5f0e8] hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Export 2x Retina PNG</span>
                </button>

                <button
                  onClick={handleExportTxt}
                  className="w-full px-3 py-2 text-left text-xs text-[#f5f0e8]/80 hover:text-[#f5f0e8] hover:bg-white/[0.06] rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono"
                >
                  <FileText className="w-3.5 h-3.5 text-[#7ab8a0]" />
                  <span>Export Tabular TXT</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Palette Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.1] hover:border-[#c9a84c]/40 text-[#f5f0e8]/70 hover:text-[#c9a84c] hover:bg-white/[0.06] transition-all flex items-center justify-center cursor-pointer relative"
            title="Palette & Theme Settings"
          >
            <Settings2 className="w-4 h-4" />
            <div
              className="w-1.5 h-1.5 rounded-full absolute bottom-1.5 right-1.5 ring-1 ring-[#070c16]"
              style={{ backgroundColor: timeline.spineColor }}
            />
          </button>

          {/* Add Event Primary Button */}
          <button
            onClick={() => setShowEventForm(true)}
            className="btn-gold h-9 px-3.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer font-mono tracking-tight"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="flex-1 mt-[112px] mb-[36px] relative">
        <TimelineRenderer
          events={events}
          bgColor={timeline.bgColor}
          spineColor={timeline.spineColor}
          tickColor={timeline.tickColor}
          textColor={timeline.textColor}
          onEventClick={(event) => {
            setEditingEvent(event);
            setShowEventForm(true);
          }}
          onBgClick={handleBgClick}
        />
      </div>

      {/* Event Add/Edit Modal */}
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
                }
              : undefined
          }
          onSave={handleSaveEvent}
          onDelete={editingEvent?.id ? handleDeleteEvent : undefined}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Timeline Settings Modal */}
      {showSettings && (
        <TimelineSettings
          bgColor={timeline.bgColor}
          spineColor={timeline.spineColor}
          tickColor={timeline.tickColor}
          textColor={timeline.textColor}
          onSave={handleSaveColors}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Studio Micro Footer Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-9 px-6 bg-[#070c16]/90 backdrop-blur-md border-t border-white/[0.06] z-40 flex items-center justify-between text-[11px] font-mono text-[#f5f0e8]/40">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400/80">
            <CheckCircle2 className="w-3 h-3" />
            <span>Synced</span>
          </span>
          <span className="hidden md:inline text-[#f5f0e8]/25">·</span>
          <span className="hidden md:inline">
            Scroll: <span className="text-[#f5f0e8]/60">Zoom</span> · Drag:{" "}
            <span className="text-[#f5f0e8]/60">Pan</span> · Click Axis:{" "}
            <span className="text-[#f5f0e8]/60">Add</span> · Key 0:{" "}
            <span className="text-[#f5f0e8]/60">Fit All</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>NeeLine Studio</span>
          <span>·</span>
          <span className="text-[#f5f0e8]/60">Devnetra Consultancy</span>
        </div>
      </div>
    </div>
  );
}

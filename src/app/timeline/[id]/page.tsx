"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TimelineRenderer from "@/components/TimelineRenderer";
import EventForm from "@/components/EventForm";
import TimelineSettings from "@/components/TimelineSettings";
import { exportTimelineAsPng, exportTimelineAsTxt } from "@/components/PngExport";

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
    // Find the LARGEST SVG (the timeline canvas), not the first one (which is the logo icon)
    let svg: SVGSVGElement | null = null;
    let maxArea = 0;
    document.querySelectorAll("svg").forEach((s) => {
      const r = s.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > maxArea) { maxArea = area; svg = s as SVGSVGElement; }
    });
    if (!svg) return;
    exportTimelineAsPng(
      svg,
      timeline?.bgColor || "#0a1628",
      `${timeline?.name || "timeline"}.png`
    );
    setShowExportMenu(false);
  }, [timeline]);

  // TXT export handler
  const handleExportTxt = useCallback(() => {
    exportTimelineAsTxt(
      events,
      `${timeline?.name || "timeline"}.txt`
    );
    setShowExportMenu(false);
  }, [events, timeline]);

  if (loading || !timeline) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-[#f5f0e8]/30 text-sm">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a1628] flex flex-col overflow-hidden">
      <Navbar />

      {/* Top bar */}
      <div className="fixed top-12 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#080e1a]/80 backdrop-blur-sm border-b border-[#c9a84c]/10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/dashboard")} className="text-xs text-[#c9a84c]/50 hover:text-[#c9a84c] transition-colors shrink-0">← Dashboard</button>
          {editingName ? (
            <input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setNameValue(timeline.name); setEditingName(false); } }}
              onBlur={handleRename} className="px-2 py-1 rounded bg-[#0a1628] border border-[#c9a84c]/30 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] min-w-0"
              style={{ fontFamily: "var(--font-display)" }} />
          ) : (
            <h1 className="text-sm font-semibold text-[#f5f0e8] truncate cursor-pointer hover:text-[#c9a84c] transition-colors"
              style={{ fontFamily: "var(--font-display)" }} onClick={() => setEditingName(true)} title="Click to rename">
              {timeline.name}
            </h1>
          )}
          <span className="text-xs text-[#f5f0e8]/20" style={{ fontFamily: "var(--font-mono)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={jsonInputRef} type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
          <div className="relative" ref={exportMenuRef}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={uploading}
              className="h-8 px-3 rounded-lg border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-medium hover:bg-[#c9a84c]/10 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {uploading ? "Importing..." : "Import & Export"}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0a1628] border border-[#c9a84c]/30 rounded-lg shadow-2xl overflow-hidden z-50">
                <button onClick={() => { jsonInputRef.current?.click(); setShowExportMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#f5f0e8]/80 hover:bg-[#c9a84c]/10 transition-colors flex items-center gap-2"><span>📂</span><span>Import JSON</span></button>
                <div className="border-t border-[#c9a84c]/10" />
                <button onClick={handleExportPng}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#f5f0e8]/80 hover:bg-[#c9a84c]/10 transition-colors flex items-center gap-2"><span>📷</span><span>Export PNG</span></button>
                <button onClick={handleExportTxt}
                  className="w-full px-4 py-2.5 text-left text-xs text-[#f5f0e8]/80 hover:bg-[#c9a84c]/10 transition-colors flex items-center gap-2"><span>📄</span><span>Export TXT</span></button>
              </div>
            )}
          </div>
          <button onClick={() => setShowEventForm(true)}
            className="h-8 px-3 rounded-lg bg-[#c9a84c] text-[#0a1628] text-xs font-semibold hover:bg-[#d4b65a] transition-colors">+ Add Event</button>
          <button onClick={() => setShowSettings(true)}
            className="h-8 w-8 rounded-lg border border-[#c9a84c]/20 text-[#c9a84c]/50 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors flex items-center justify-center"
            title="Timeline Settings">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 mt-[104px] mb-[32px]">
        <TimelineRenderer events={events} bgColor={timeline.bgColor} spineColor={timeline.spineColor}
          tickColor={timeline.tickColor} textColor={timeline.textColor}
          onEventClick={(event) => { setEditingEvent(event); setShowEventForm(true); }} onBgClick={handleBgClick} />
      </div>
      {showEventForm && (
        <EventForm initialData={editingEvent ? {
          id: editingEvent.id || undefined, year: editingEvent.year, isBce: editingEvent.isBce,
          month: editingEvent.month?.toString() || "", day: editingEvent.day?.toString() || "",
          title: editingEvent.title, description: editingEvent.description || "", color: editingEvent.color,
        } : undefined} onSave={handleSaveEvent} onDelete={editingEvent?.id ? handleDeleteEvent : undefined}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }} />
      )}
      {showSettings && (
        <TimelineSettings bgColor={timeline.bgColor} spineColor={timeline.spineColor}
          tickColor={timeline.tickColor} textColor={timeline.textColor}
          onSave={handleSaveColors} onClose={() => setShowSettings(false)} />
      )}
      <div className="shrink-0 text-center py-2 bg-[#080e1a]/60 backdrop-blur-sm border-t border-[#c9a84c]/10 z-40">
        <p className="text-[10px] text-[#f5f0e8]/25" style={{ fontFamily: "var(--font-mono)" }}>
          Made With Care By Devnetra Consultancy
        </p>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Trash2,
  X,
  Sparkles,
  Layers,
  Plus,
  BookOpen,
  Check,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export interface LayerItem {
  id: string;
  name: string;
  color: string;
}

export interface ExistingEventOption {
  id: string;
  title: string;
  year: number;
  isBce: boolean;
  month?: number | null;
  day?: number | null;
}

export interface EventFormData {
  id?: string;
  year: number;
  isBce: boolean;
  month: string;
  day: string;
  title: string;
  description: string;
  color: string;
  layer?: string;
  // Span / Horizontal Bracket
  isSpan?: boolean;
  endYear?: string | number | null;
  endIsBce?: boolean;
  endMonth?: string;
  endDay?: string;
}

interface EventFormProps {
  initialData?: EventFormData;
  existingEvents?: ExistingEventOption[];
  availableLayers?: LayerItem[];
  onCreateLayer?: (name: string, color: string) => Promise<LayerItem>;
  onSave: (data: EventFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const COLOR_PALETTE = [
  { hex: "#c9a84c", label: "Imperial Gold" },
  { hex: "#e8d5a3", label: "Parchment" },
  { hex: "#7ab8a0", label: "Sage" },
  { hex: "#5a9bd5", label: "Azure" },
  { hex: "#d4786c", label: "Terracotta" },
  { hex: "#b07cc6", label: "Amethyst" },
  { hex: "#e8a87c", label: "Coral" },
  { hex: "#7cc6d4", label: "Cyan" },
  { hex: "#d4a5c9", label: "Rose" },
  { hex: "#a8b87a", label: "Olive" },
  { hex: "#f43f5e", label: "Crimson" },
  { hex: "#10b981", label: "Emerald" },
];

export default function EventForm({
  initialData,
  existingEvents = [],
  availableLayers = [],
  onCreateLayer,
  onSave,
  onDelete,
  onClose,
}: EventFormProps) {
  const [mounted, setMounted] = useState(false);

  // Helper to reliably determine whether event is a bracketed period span
  const computeIsSpan = (data?: EventFormData): boolean => {
    if (!data) return false;
    if (typeof data.isSpan === "boolean") return data.isSpan;
    return Boolean(
      data.endYear !== undefined &&
      data.endYear !== null &&
      String(data.endYear).trim() !== ""
    );
  };

  const [isSpan, setIsSpan] = useState(() => computeIsSpan(initialData));

  // Start Date
  const [year, setYear] = useState(initialData?.year?.toString() || "");
  const [isBce, setIsBce] = useState(initialData?.isBce || false);
  const [month, setMonth] = useState(initialData?.month || "");
  const [day, setDay] = useState(initialData?.day || "");

  // End Date (for horizontal square bracket span)
  const [endYear, setEndYear] = useState(
    initialData?.endYear !== undefined && initialData?.endYear !== null
      ? String(initialData.endYear)
      : ""
  );
  const [endIsBce, setEndIsBce] = useState(initialData?.endIsBce || false);
  const [endMonth, setEndMonth] = useState(initialData?.endMonth || "");
  const [endDay, setEndDay] = useState(initialData?.endDay || "");

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#c9a84c");
  const [selectedLayer, setSelectedLayer] = useState(
    initialData?.layer || (availableLayers[0]?.name ?? "General")
  );

  // Synchronize state when initialData or availableLayers changes
  useEffect(() => {
    if (initialData) {
      const spanMode = computeIsSpan(initialData);
      setIsSpan(spanMode);
      setYear(
        initialData.year !== undefined && initialData.year !== null
          ? String(initialData.year)
          : ""
      );
      setIsBce(initialData.isBce || false);
      setMonth(initialData.month || "");
      setDay(initialData.day || "");
      setEndYear(
        initialData.endYear !== undefined && initialData.endYear !== null
          ? String(initialData.endYear)
          : ""
      );
      setEndIsBce(initialData.endIsBce || false);
      setEndMonth(initialData.endMonth || "");
      setEndDay(initialData.endDay || "");
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setColor(initialData.color || "#c9a84c");
      setSelectedLayer(initialData.layer || (availableLayers[0]?.name ?? "General"));
    } else {
      setIsSpan(false);
      setYear("");
      setIsBce(false);
      setMonth("");
      setDay("");
      setEndYear("");
      setEndIsBce(false);
      setEndMonth("");
      setEndDay("");
      setTitle("");
      setDescription("");
      setColor("#c9a84c");
      setSelectedLayer(availableLayers[0]?.name ?? "General");
    }
  }, [initialData, availableLayers]);

  // Quick inline new layer creation
  const [showNewLayerInput, setShowNewLayerInput] = useState(false);
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerColor, setNewLayerColor] = useState("#5a9bd5");

  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData?.id;

  useEffect(() => {
    setMounted(true);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, []);

  async function handleQuickCreateLayer() {
    const trimmed = newLayerName.trim();
    if (!trimmed) return;
    if (onCreateLayer) {
      const created = await onCreateLayer(trimmed, newLayerColor);
      setSelectedLayer(created.name);
      setColor(created.color);
    } else {
      setSelectedLayer(trimmed);
      setColor(newLayerColor);
    }
    setNewLayerName("");
    setShowNewLayerInput(false);
  }

  // Quick Pick Event Linkers
  const handleSelectStartEvent = (eventId: string) => {
    const ev = existingEvents.find((e) => e.id === eventId);
    if (!ev) return;
    setYear(String(ev.year));
    setIsBce(ev.isBce);
    setMonth(ev.month ? String(ev.month) : "");
    setDay(ev.day ? String(ev.day) : "");
  };

  const handleSelectEndEvent = (eventId: string) => {
    const ev = existingEvents.find((e) => e.id === eventId);
    if (!ev) return;
    setEndYear(String(ev.year));
    setEndIsBce(ev.isBce);
    setEndMonth(ev.month ? String(ev.month) : "");
    setEndDay(ev.day ? String(ev.day) : "");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedStart = parseInt(year, 10);
    if (isNaN(parsedStart) || !title.trim()) return;
    const startYearNum = Math.abs(parsedStart);

    let parsedEndNum: number | null = null;
    if (isSpan) {
      const parsedEnd = parseInt(endYear, 10);
      if (isNaN(parsedEnd)) return;
      parsedEndNum = Math.abs(parsedEnd);
    }

    setSaving(true);
    await onSave({
      id: initialData?.id,
      year: startYearNum,
      isBce,
      month: month || "",
      day: day || "",
      title: title.trim(),
      description: description.trim(),
      color,
      layer: selectedLayer.trim() || (availableLayers[0]?.name ?? "General"),
      isSpan,
      endYear: isSpan ? parsedEndNum : null,
      endIsBce: isSpan ? endIsBce : false,
      endMonth: isSpan ? endMonth || "" : "",
      endDay: isSpan ? endDay || "" : "",
    });
    setSaving(false);
  }

  async function handleExecuteDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // Live formatted date label preview for point milestone
  const previewDate = () => {
    const parsed = parseInt(year, 10);
    const y = !isNaN(parsed) ? Math.abs(parsed).toLocaleString() : "0";
    const era = isBce ? "BCE" : "CE";
    if (month && day) return `${month}/${day}, ${y} ${era}`;
    if (month) return `M${month}, ${y} ${era}`;
    return `${y} ${era}`;
  };

  // Live span preview for horizontal bracket
  const previewSpan = () => {
    const y1 = parseInt(year, 10);
    const y2 = parseInt(endYear, 10);
    if (isNaN(y1) || isNaN(y2)) return null;
    const startNum = isBce ? -Math.abs(y1) : Math.abs(y1);
    const endNum = endIsBce ? -Math.abs(y2) : Math.abs(y2);
    let diff = Math.abs(endNum - startNum);
    if ((isBce && !endIsBce) || (!isBce && endIsBce)) {
      diff = Math.max(1, diff - 1);
    }
    const sLabel = `${Math.abs(y1).toLocaleString()} ${isBce ? "BCE" : "CE"}`;
    const eLabel = `${Math.abs(y2).toLocaleString()} ${endIsBce ? "BCE" : "CE"}`;
    return {
      diffYears: diff.toLocaleString(),
      sLabel,
      eLabel,
    };
  };

  const spanInfo = previewSpan();

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2
                className="text-xs font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isEditing
                  ? isSpan
                    ? "Edit Bracketed Period"
                    : "Edit Chronicle Milestone"
                  : isSpan
                  ? "Add Horizontal Bracket Period"
                  : "Add Chronicle Milestone"}
              </h2>
              <p className="text-[9.5px] font-mono theme-text-muted">
                {isSpan
                  ? "Horizontal square bracket spanning between coordinates"
                  : "Temporal coordinate and historical milestone"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Milestone vs Horizontal Bracket Period Segmented Switcher */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsSpan(false)}
              className={`flex-1 py-1 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isSpan
                  ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-xs"
                  : "theme-text-muted hover:opacity-100"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Point Milestone</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSpan(true)}
              className={`flex-1 py-1 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSpan
                  ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 font-semibold shadow-xs"
                  : "theme-text-muted hover:opacity-100"
              }`}
            >
              <span className="font-mono font-bold text-xs leading-none">[───]</span>
              <span>Horizontal Bracket Span</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Card Preview */}
        <div className="px-4 pt-1.5 pb-1 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent">
          <div className="text-[9.5px] font-mono uppercase tracking-wider theme-text-muted mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Canvas Visual Preview</span>
            </span>
            <span className="text-[9.5px] font-semibold" style={{ color }}>
              Layer: {selectedLayer || "General"}
            </span>
          </div>

          {!isSpan ? (
            /* Point Milestone Preview */
            <div
              className="p-2.5 rounded-lg bg-black/[0.04] dark:bg-[#070c16]/80 border flex items-center justify-between gap-2.5 shadow-inner transition-colors duration-200"
              style={{ borderColor: `${color}80` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-2.5 h-6 rounded shrink-0 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <div
                    className="text-xs font-semibold theme-card-title truncate leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title.trim() || "Milestone Title"}
                  </div>
                  <div
                    className="text-[10px] font-mono font-medium"
                    style={{ color }}
                  >
                    {previewDate()}
                  </div>
                </div>
              </div>
              <div
                className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border shrink-0"
                style={{
                  borderColor: `${color}60`,
                  backgroundColor: `${color}18`,
                  color,
                }}
              >
                {isBce ? "BCE Era" : "Common Era"}
              </div>
            </div>
          ) : (
            /* Horizontal Square Bracket Preview */
            <div
              className="p-2 rounded-lg bg-black/[0.04] dark:bg-[#070c16]/80 border flex flex-col gap-1.5 shadow-inner transition-colors duration-200"
              style={{ borderColor: `${color}80` }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#38bdf8] font-semibold flex items-center gap-1">
                  <span>[</span>
                  <span>{spanInfo ? spanInfo.sLabel : previewDate()}</span>
                </span>
                <span className="text-[9.5px] theme-text-muted">
                  {spanInfo ? `${spanInfo.diffYears} yrs span` : "Bracketed Range"}
                </span>
                <span className="text-[#38bdf8] font-semibold flex items-center gap-1">
                  <span>{spanInfo ? spanInfo.eLabel : "End Date"}</span>
                  <span>]</span>
                </span>
              </div>

              {/* Bracket Diagram Simulation */}
              <div className="relative flex items-center justify-center my-0.5">
                <div
                  className="absolute left-0 right-0 h-[1.5px]"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="absolute left-0 top-[-4px] w-[2px] h-[10px]"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="absolute right-0 top-[-4px] w-[2px] h-[10px]"
                  style={{ backgroundColor: color }}
                />

                {/* Center Badge with Title & Chronicle Notes Indicator */}
                <div
                  className="relative z-10 px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1 shadow-xs bg-white dark:bg-[#0a101c]"
                  style={{
                    borderColor: color,
                    color,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <span className="truncate max-w-[200px]">
                    {title.trim() || "Period Name"}
                  </span>
                  <BookOpen className="w-2.5 h-2.5 text-[#c9a84c] shrink-0" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
          {/* Historical Period / Layer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono theme-text-muted uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#c9a84c]" />
                <span>Historical Period / Layer</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewLayerInput((prev) => !prev)}
                className="text-[10px] font-mono text-[#c9a84c] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{showNewLayerInput ? "Cancel Period" : "New Period"}</span>
              </button>
            </div>

            {showNewLayerInput ? (
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[#c9a84c]/40 space-y-2 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    placeholder="Period Name (e.g. Bronze Age, Classical)"
                    className="flex-1 px-3 py-1.5 rounded-lg theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  />
                  <input
                    type="color"
                    value={newLayerColor}
                    onChange={(e) => setNewLayerColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer p-0.5 bg-transparent border border-black/15 dark:border-white/15"
                    title="Choose Period Color"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateLayer}
                    disabled={!newLayerName.trim()}
                    className="btn-gold px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Visual Period Color Indicator Pill */}
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/20 dark:border-white/20 transition-all"
                  style={{ backgroundColor: color }}
                  title="Active Period Color"
                />
                <select
                  value={selectedLayer}
                  onChange={(e) => {
                    const lyr = e.target.value;
                    setSelectedLayer(lyr);
                    const found = availableLayers.find((l) => l.name === lyr);
                    if (found) setColor(found.color);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all cursor-pointer bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                  style={{
                    backgroundColor: "var(--color-bg-light, #0d1527)",
                    color: "var(--color-text, #f5f0e8)",
                  }}
                >
                  {availableLayers.length > 0 ? (
                    availableLayers.map((l) => (
                      <option
                        key={l.id || l.name}
                        value={l.name}
                        className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                        style={{
                          backgroundColor: "var(--color-bg-light, #0d1527)",
                          color: "var(--color-text, #f5f0e8)",
                        }}
                      >
                        {l.name}
                      </option>
                    ))
                  ) : (
                    <option
                      value="General"
                      className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                      style={{
                        backgroundColor: "var(--color-bg-light, #0d1527)",
                        color: "var(--color-text, #f5f0e8)",
                      }}
                    >
                      General Chronicle
                    </option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Section 1: Start Temporal Coordinate */}
          <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#c9a84c]">
                {isSpan ? "1. Start Temporal Coordinate" : "Temporal Coordinate"}
              </span>

              {/* Quick Pick from Existing Event */}
              {isSpan && existingEvents.length > 0 && (
                <select
                  onChange={(e) => handleSelectStartEvent(e.target.value)}
                  defaultValue=""
                  className="px-2 py-0.5 rounded text-[10px] font-mono theme-input outline-none cursor-pointer text-[#c9a84c] bg-white dark:bg-[#0d1527]"
                  style={{
                    backgroundColor: "var(--color-bg-light, #0d1527)",
                  }}
                >
                  <option
                    value=""
                    disabled
                    className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                    style={{
                      backgroundColor: "var(--color-bg-light, #0d1527)",
                      color: "var(--color-text, #f5f0e8)",
                    }}
                  >
                    Link start to milestone...
                  </option>
                  {existingEvents.map((ev) => (
                    <option
                      key={`start-${ev.id}`}
                      value={ev.id}
                      className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                      style={{
                        backgroundColor: "var(--color-bg-light, #0d1527)",
                        color: "var(--color-text, #f5f0e8)",
                      }}
                    >
                      {ev.title} ({ev.year} {ev.isBce ? "BCE" : "CE"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Era Toggle */}
              <div>
                <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                  Start Era
                </label>
                <div className="flex rounded-xl bg-black/[0.04] dark:bg-white/[0.04] p-1 border border-black/10 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsBce(true)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isBce
                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-sm"
                        : "theme-text-muted hover:opacity-100"
                    }`}
                  >
                    BCE
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBce(false)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      !isBce
                        ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 shadow-sm"
                        : "theme-text-muted hover:opacity-100"
                    }`}
                  >
                    CE
                  </button>
                </div>
              </div>

              {/* Year Input */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1 font-medium">
                  Start Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 509"
                  required
                  className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
                />
              </div>
            </div>

            {/* Optional Month and Day */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                  Month (1-12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                  Day (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: End Temporal Coordinate (When in Bracket Span Mode) */}
          {isSpan && (
            <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08] space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#38bdf8]">
                  2. End Temporal Coordinate (Bracket Right Cap)
                </span>

                {/* Quick Pick from Existing Event */}
                {existingEvents.length > 0 && (
                  <select
                    onChange={(e) => handleSelectEndEvent(e.target.value)}
                    defaultValue=""
                    className="px-2 py-0.5 rounded text-[10px] font-mono theme-input outline-none cursor-pointer text-[#38bdf8] bg-white dark:bg-[#0d1527]"
                    style={{
                      backgroundColor: "var(--color-bg-light, #0d1527)",
                    }}
                  >
                    <option
                      value=""
                      disabled
                      className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                      style={{
                        backgroundColor: "var(--color-bg-light, #0d1527)",
                        color: "var(--color-text, #f5f0e8)",
                      }}
                    >
                      Link end to milestone...
                    </option>
                    {existingEvents.map((ev) => (
                      <option
                        key={`end-${ev.id}`}
                        value={ev.id}
                        className="bg-white dark:bg-[#0d1527] text-[#0f172a] dark:text-[#f5f0e8]"
                        style={{
                          backgroundColor: "var(--color-bg-light, #0d1527)",
                          color: "var(--color-text, #f5f0e8)",
                        }}
                      >
                        {ev.title} ({ev.year} {ev.isBce ? "BCE" : "CE"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Era Toggle */}
                <div>
                  <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                    End Era
                  </label>
                  <div className="flex rounded-xl bg-black/[0.04] dark:bg-white/[0.04] p-1 border border-black/10 dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setEndIsBce(true)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        endIsBce
                          ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-sm"
                          : "theme-text-muted hover:opacity-100"
                      }`}
                    >
                      BCE
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndIsBce(false)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        !endIsBce
                          ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm"
                          : "theme-text-muted hover:opacity-100"
                      }`}
                    >
                      CE
                    </button>
                  </div>
                </div>

                {/* End Year Input */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1 font-medium">
                    End Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="e.g. 27"
                    required
                    className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 transition-all"
                  />
                </div>
              </div>

              {/* Optional Month and Day */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                    End Month (1-12)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#38bdf8] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1">
                    End Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={endDay}
                    onChange={(e) => setEndDay(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-1.5 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#38bdf8] transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium flex items-center justify-between">
              <span>
                {isSpan ? "Period / Span Name" : "Milestone Title"}{" "}
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] opacity-60">Required</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isSpan ? "e.g. Roman Republic, Pax Romana, Bronze Age..." : "e.g. Magna Carta, Council of Nicaea..."}
              required
              className="w-full px-3.5 py-2.5 rounded-xl theme-input text-sm outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>

          {/* Chronicle Notes & Narrative (with Mechanism Support) */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Chronicle Notes & Historical Context</span>
              </span>
              <span className="text-[10px] opacity-60">Hover/Click mechanism on Canvas</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chronicle notes, primary historical citations, archaeological findings, or period scope details..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl theme-input text-xs outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 resize-none transition-all leading-relaxed font-light"
            />
          </div>

          {/* Color Palette Selection */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
              Milestone & Bracket Line Color
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-1 scrollbar-thin">
              {COLOR_PALETTE.map((c) => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#c9a84c] ring-offset-white dark:ring-offset-[#131c2e] shadow-sm"
                        : "opacity-80 hover:opacity-100 hover:ring-1 hover:ring-black/20 dark:hover:ring-white/30"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3]" />
                    )}
                  </button>
                );
              })}
              <div className="relative shrink-0 flex items-center justify-center ml-0.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded-full cursor-pointer p-0.5 bg-transparent border border-black/20 dark:border-white/20 transition-all hover:border-[#c9a84c]"
                  title="Custom Color"
                />
              </div>
            </div>
          </div>

          {/* Compact Footer Actions */}
          <div className="pt-2.5 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2 py-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-medium"
                title="Delete Milestone"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !title.trim() || !year.trim() || (isSpan && !endYear.trim())}
                className="btn-gold px-4 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <span>
                    {isEditing
                      ? isSpan
                        ? "Update Bracket Period"
                        : "Update Milestone"
                      : isSpan
                      ? "Add Bracket to Line"
                      : "Add to Number Line"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Milestone / Period Deletion */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={isSpan ? "Delete Bracketed Period" : "Delete Chronicle Milestone"}
        message={`Are you sure you want to remove "${title || (isSpan ? "this period" : "this milestone")}" from the chronicle number line?`}
        confirmLabel={isSpan ? "Delete Period" : "Delete Milestone"}
        cancelLabel={isSpan ? "Keep Period" : "Keep Milestone"}
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleExecuteDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>,
    document.body
  );
}

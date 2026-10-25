"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { LayerItem } from "./TimelineRenderer";

interface ImportModalProps {
  isOpen: boolean;
  timelineId: string;
  availableLayers: LayerItem[];
  onImportComplete: (count: number, newLayer?: LayerItem) => void;
  onClose: () => void;
}

interface ParsedEventItem {
  title: string;
  year: number;
  isBce: boolean;
  month?: number | null;
  day?: number | null;
  endYear?: number | null;
  endIsBce?: boolean | null;
  endMonth?: number | null;
  endDay?: number | null;
  color?: string;
  layer?: string | null;
  description?: string | null;
}

const PRESET_NEW_COLORS = ["#38bdf8", "#c9a84c", "#10b981", "#f43f5e", "#a855f7", "#f97316"];

export default function ImportModal({
  isOpen,
  timelineId,
  availableLayers,
  onImportComplete,
  onClose,
}: ImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedEventItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  // Layer assignment option: "existing" | "new" | "preserve"
  const [layerMode, setLayerMode] = useState<"existing" | "new" | "preserve">("existing");
  const [selectedExistingLayer, setSelectedExistingLayer] = useState<string>(
    availableLayers[0]?.name || "General"
  );
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerColor, setNewLayerColor] = useState("#38bdf8");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (availableLayers.length > 0 && !selectedExistingLayer) {
      setSelectedExistingLayer(availableLayers[0].name);
    }
  }, [availableLayers, selectedExistingLayer]);

  if (!isOpen || !mounted) return null;

  const handleProcessFile = (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        let list: Record<string, unknown>[] = [];
        if (Array.isArray(json)) {
          list = json as Record<string, unknown>[];
        } else if (Array.isArray(json.events)) {
          list = json.events as Record<string, unknown>[];
        } else {
          throw new Error("JSON file must be an array of events or an object with an 'events' array.");
        }

        if (list.length === 0) {
          throw new Error("The selected JSON file contains no events.");
        }

        const valid: ParsedEventItem[] = list.map((item, idx) => {
          if (item.year === undefined || item.year === null) {
            throw new Error(`Item at index ${idx} is missing a required 'year' property.`);
          }
          const hasSpan = item.endYear !== undefined && item.endYear !== null;
          return {
            title: String(item.title || `Milestone ${idx + 1}`).trim(),
            year: Math.abs(parseInt(String(item.year), 10)),
            isBce: Boolean(item.isBce),
            month: item.month ? parseInt(String(item.month), 10) : null,
            day: item.day ? parseInt(String(item.day), 10) : null,
            endYear: hasSpan ? Math.abs(parseInt(String(item.endYear), 10)) : null,
            endIsBce: hasSpan ? Boolean(item.endIsBce) : null,
            endMonth: item.endMonth ? parseInt(String(item.endMonth), 10) : null,
            endDay: item.endDay ? parseInt(String(item.endDay), 10) : null,
            color: typeof item.color === "string" && item.color.startsWith("#") ? item.color : "#c9a84c",
            layer: item.layer ? String(item.layer).trim() : null,
            description: item.description ? String(item.description) : null,
          };
        });

        setParsedEvents(valid);

        // If file had layer names specified, default to "preserve"
        const hasExplicitLayers = valid.some((e) => e.layer);
        if (hasExplicitLayers) {
          setLayerMode("preserve");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to parse JSON file.";
        setParseError(message);
        setParsedEvents([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Stats on parsed events
  const spanCount = parsedEvents.filter((e) => e.endYear !== null).length;
  const pointCount = parsedEvents.length - spanCount;

  const handleExecuteImport = async () => {
    if (parsedEvents.length === 0) return;
    setImporting(true);

    try {
      let createdLayerObj: LayerItem | undefined;

      // If creating a new layer
      if (layerMode === "new") {
        const cleanName = newLayerName.trim() || "Imported Period";
        createdLayerObj = {
          id: `layer-${Date.now()}`,
          name: cleanName,
          color: newLayerColor,
        };
      }

      // Map each event according to user layer selection
      const payloadEvents = parsedEvents.map((e) => {
        let assignedLayer: string | null = null;
        let assignedColor = e.color || "#c9a84c";

        if (layerMode === "existing") {
          assignedLayer = selectedExistingLayer;
          const found = availableLayers.find((l) => l.name === selectedExistingLayer);
          if (found) assignedColor = found.color;
        } else if (layerMode === "new") {
          assignedLayer = createdLayerObj?.name || "Imported Period";
          assignedColor = newLayerColor;
        } else if (layerMode === "preserve") {
          assignedLayer = e.layer || "General";
        }

        return {
          ...e,
          layer: assignedLayer,
          color: assignedColor,
        };
      });

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timelineId,
          events: payloadEvents,
        }),
      });

      if (!res.ok) {
        throw new Error("Server error during batch import");
      }

      onImportComplete(payloadEvents.length, createdLayerObj);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import events. Please try again.";
      setParseError(message);
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.12] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5a9bd5]/15 text-[#5a9bd5] border border-[#5a9bd5]/30 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Import JSON Callset & Layer Routing
              </h2>
              <p className="text-[11px] font-mono theme-text-muted">
                Batch import milestones and route into specific historical periods
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* File Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
            className="hidden"
          />

          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#c9a84c] bg-[#c9a84c]/10"
                  : "border-black/15 dark:border-white/15 hover:border-[#c9a84c]/60 bg-black/[0.02] dark:bg-white/[0.02]"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-sm font-semibold theme-card-title font-sans mb-1">
                Drag and drop your JSON callset here
              </p>
              <p className="text-[11px] theme-text-muted font-sans font-light max-w-xs">
                Supports Point Milestones, Horizontal Bracket Spans, and Custom Layers.
              </p>
              <span className="mt-3 px-3 py-1 rounded-lg theme-pill text-[10px] text-[#c9a84c] border border-[#c9a84c]/30 font-semibold">
                Browse File (.json)
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold theme-card-title truncate max-w-xs">
                    {file.name}
                  </div>
                  <div className="text-[10px] theme-text-muted">
                    {(file.size / 1024).toFixed(1)} KB • {parsedEvents.length} events detected
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedEvents([]);
                  setParseError(null);
                }}
                className="text-[10px] font-mono text-rose-500 hover:underline px-2 py-1 rounded cursor-pointer"
              >
                Change File
              </button>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Events Summary & Layer Routing Options */}
          {parsedEvents.length > 0 && (
            <>
              {/* Event Statistics Chip */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08] grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="text-[10px] theme-text-muted block font-sans">Total Events</span>
                  <span className="text-sm font-bold text-[#c9a84c]">{parsedEvents.length}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="text-[10px] theme-text-muted block font-sans">Point Milestones</span>
                  <span className="text-sm font-bold text-[#5a9bd5]">{pointCount}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="text-[10px] theme-text-muted block font-sans">Bracket Spans</span>
                  <span className="text-sm font-bold text-[#38bdf8]">{spanCount}</span>
                </div>
              </div>

              {/* Layer Selection / Routing Section */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-mono theme-text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Which Layer Should These Events Go To?</span>
                </label>

                {/* Option 1: Existing Layer */}
                <div
                  onClick={() => setLayerMode("existing")}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    layerMode === "existing"
                      ? "border-[#c9a84c] bg-[#c9a84c]/10"
                      : "border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="layerMode"
                      checked={layerMode === "existing"}
                      onChange={() => setLayerMode("existing")}
                      className="accent-[#c9a84c]"
                    />
                    <span className="font-semibold text-xs theme-card-title font-sans">
                      Assign to an existing layer
                    </span>
                  </label>

                  {layerMode === "existing" && (
                    <div className="mt-2.5 pl-6">
                      <select
                        value={selectedExistingLayer}
                        onChange={(e) => setSelectedExistingLayer(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c]"
                      >
                        {availableLayers.map((l) => (
                          <option key={l.id || l.name} value={l.name}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Option 2: New Custom Layer */}
                <div
                  onClick={() => setLayerMode("new")}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    layerMode === "new"
                      ? "border-[#c9a84c] bg-[#c9a84c]/10"
                      : "border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="layerMode"
                      checked={layerMode === "new"}
                      onChange={() => setLayerMode("new")}
                      className="accent-[#c9a84c]"
                    />
                    <span className="font-semibold text-xs theme-card-title font-sans">
                      Create a new layer for all imported events
                    </span>
                  </label>

                  {layerMode === "new" && (
                    <div className="mt-2.5 pl-6 space-y-2">
                      <input
                        type="text"
                        value={newLayerName}
                        onChange={(e) => setNewLayerName(e.target.value)}
                        placeholder="New Layer Name (e.g. Classical Antiquity, World War I)"
                        className="w-full px-3 py-1.5 rounded-lg theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c]"
                      />
                      <div className="flex items-center gap-2 py-1.5 px-0.5">
                        <span className="text-[10px] theme-text-muted">Color:</span>
                        {PRESET_NEW_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewLayerColor(c)}
                            className={`w-5 h-5 rounded-full transition-all shrink-0 ${
                              newLayerColor === c ? "ring-2 ring-[#c9a84c] ring-offset-1 ring-offset-white dark:ring-offset-[#131c2e]" : "opacity-70 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 3: Preserve JSON layers */}
                <div
                  onClick={() => setLayerMode("preserve")}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    layerMode === "preserve"
                      ? "border-[#c9a84c] bg-[#c9a84c]/10"
                      : "border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="layerMode"
                      checked={layerMode === "preserve"}
                      onChange={() => setLayerMode("preserve")}
                      className="accent-[#c9a84c]"
                    />
                    <div>
                      <span className="font-semibold text-xs theme-card-title font-sans block">
                        Preserve layers specified inside JSON file
                      </span>
                      <span className="text-[10px] theme-text-muted font-sans font-light">
                        Events will keep their individual layer tags. Missing layers default to General.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={importing || parsedEvents.length === 0}
            className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {importing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#070c16]/40 border-t-[#070c16] rounded-full animate-spin" />
                <span>Importing Callset...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Import {parsedEvents.length > 0 ? `${parsedEvents.length} Events` : "Callset"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

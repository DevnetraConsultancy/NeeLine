"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Download, X, Layers, Check } from "lucide-react";
import { LayerItem } from "./TimelineRenderer";

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

interface ExportJsonModalProps {
  isOpen: boolean;
  timeline: TimelineData | null;
  layers: LayerItem[];
  events: EventData[];
  onClose: () => void;
}

export default function ExportJsonModal({
  isOpen,
  timeline,
  layers,
  events,
  onClose,
}: ExportJsonModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When modal opens, initialize all available layers as selected
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current && layers.length > 0) {
        setSelectedLayers(layers.map((l) => l.name));
        wasOpenRef.current = true;
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, layers]);

  // Compute event counts per layer
  const layerEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    layers.forEach((l) => {
      counts[l.name.toLowerCase().trim()] = 0;
    });

    events.forEach((e) => {
      const lyr = ((e.layer && e.layer.trim()) || "General").toLowerCase();
      counts[lyr] = (counts[lyr] || 0) + 1;
    });

    return counts;
  }, [layers, events]);

  // Check if all layers are currently selected
  const allSelected = useMemo(() => {
    if (layers.length === 0) return false;
    return layers.every((l) =>
      selectedLayers.some((n) => n.trim().toLowerCase() === l.name.trim().toLowerCase())
    );
  }, [layers, selectedLayers]);

  // Toggle single layer cleanly with no synthetic event conflicts
  const toggleLayer = useCallback((layerName: string) => {
    const target = layerName.trim().toLowerCase();
    setSelectedLayers((prev) => {
      const exists = prev.some((n) => n.trim().toLowerCase() === target);
      if (exists) {
        return prev.filter((n) => n.trim().toLowerCase() !== target);
      } else {
        return [...prev, layerName];
      }
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedLayers([]);
    } else {
      setSelectedLayers(layers.map((l) => l.name));
    }
  }, [allSelected, layers]);

  // Calculate filtered events according to selected layers
  const selectedEvents = useMemo(() => {
    const lowerSelected = selectedLayers.map((l) => l.toLowerCase().trim());
    return events.filter((e) => {
      const lyr = ((e.layer && e.layer.trim()) || "General").toLowerCase();
      return lowerSelected.includes(lyr);
    });
  }, [events, selectedLayers]);

  if (!isOpen || !mounted || !timeline) return null;

  const handleExecuteExport = () => {
    if (selectedLayers.length === 0) return;

    const lowerSelected = selectedLayers.map((l) => l.toLowerCase().trim());

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
      layers: layers
        .filter((l) => lowerSelected.includes(l.name.toLowerCase().trim()))
        .map((l) => ({ name: l.name, color: l.color })),
      events: selectedEvents.map((e) => ({
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
    a.download = `${timeline.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.12] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2
                className="text-sm font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Export as JSON
              </h2>
              <p className="text-[10px] font-mono theme-text-muted">
                Select layers to include in exported callset
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 text-xs font-mono">
          {/* Quick Action Selection Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] theme-text-muted flex items-center gap-1.5 font-sans">
              <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>Layers to Export:</span>
            </span>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[11px] font-semibold text-[#c9a84c] hover:underline flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-[#c9a84c]/10 transition-colors"
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                  allSelected
                    ? "bg-[#c9a84c] border-[#c9a84c] text-[#070c16]"
                    : "border-black/30 dark:border-white/30 bg-transparent"
                }`}
              >
                {allSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span>{allSelected ? "Deselect All" : "Select All"}</span>
            </button>
          </div>

          {/* Layer Interactive Row List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {layers.map((layer) => {
              const isChecked = selectedLayers.some(
                (n) => n.trim().toLowerCase() === layer.name.trim().toLowerCase()
              );
              const count = layerEventCounts[layer.name.toLowerCase().trim()] || 0;

              return (
                <button
                  type="button"
                  key={layer.id || layer.name}
                  onClick={() => toggleLayer(layer.name)}
                  className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                    isChecked
                      ? "border-[#c9a84c] bg-[#c9a84c]/12 shadow-xs"
                      : "border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Custom Checkbox Box */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        isChecked
                          ? "bg-[#c9a84c] border-[#c9a84c] text-[#070c16]"
                          : "border-black/30 dark:border-white/30 bg-transparent"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Color dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: layer.color || "#c9a84c" }}
                    />

                    {/* Layer Name */}
                    <span className="font-semibold text-xs theme-card-title font-sans truncate">
                      {layer.name}
                    </span>
                  </div>

                  {/* Event Count Badge */}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 transition-colors ${
                      count > 0
                        ? isChecked
                          ? "bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/40 font-semibold"
                          : "bg-black/[0.04] dark:bg-white/[0.05] theme-text-muted border-black/10 dark:border-white/10"
                        : "bg-black/[0.02] dark:bg-white/[0.02] theme-text-muted opacity-50 border-black/5 dark:border-white/5"
                    }`}
                  >
                    {count} {count === 1 ? "event" : "events"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Summary Payload Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08] text-[11px]">
            <span className="theme-text-muted font-sans">Export Payload:</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[#c9a84c] font-bold">
                {selectedLayers.length} {selectedLayers.length === 1 ? "layer" : "layers"}
              </span>
              <span className="theme-text-muted">•</span>
              <span className="text-emerald-500 font-bold">
                {selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end gap-2.5 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={selectedLayers.length === 0}
            className="btn-gold px-4 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              Export {selectedEvents.length} {selectedEvents.length === 1 ? "Event" : "Events"}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

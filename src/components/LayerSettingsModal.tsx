"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Layers,
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  Palette,
  AlertTriangle,
  ArrowRightLeft,
  CheckSquare,
  Square,
} from "lucide-react";
import { CANVAS_COLOR_PRESETS } from "@/types";
import { LayerItem, EventData } from "@/components/TimelineRenderer";

interface LayerSettingsModalProps {
  layers: LayerItem[];
  events: EventData[];
  activeLayerNames: string[];
  onToggleLayer: (name: string) => void;
  onToggleAllLayers: (all: boolean) => void;
  onMoveLayer: (index: number, direction: "up" | "down") => void;
  onRenameLayer: (oldName: string, newName: string) => Promise<void>;
  onChangeLayerColor: (layerName: string, newColor: string) => Promise<void>;
  onCreateLayer: (name: string, color: string) => Promise<LayerItem>;
  onDeleteLayerWithOption: (layerName: string, deleteEvents: boolean) => Promise<void>;
  showGapBorder?: boolean;
  onToggleGapBorder?: (show: boolean) => void;
  onClose: () => void;
}

export default function LayerSettingsModal({
  layers,
  events,
  activeLayerNames,
  onToggleLayer,
  onToggleAllLayers,
  onMoveLayer,
  onRenameLayer,
  onChangeLayerColor,
  onCreateLayer,
  onDeleteLayerWithOption,
  showGapBorder = true,
  onToggleGapBorder,
  onClose,
}: LayerSettingsModalProps) {
  const [mounted, setMounted] = useState(false);

  // New Layer State
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerColor, setNewLayerColor] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename Layer State
  const [renamingLayerName, setRenamingLayerName] = useState<string | null>(null);
  const [editRenameValue, setEditRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Change Color State
  const [colorPickerLayerName, setColorPickerLayerName] = useState<string | null>(null);

  // Delete Layer Confirmation State
  const [layerToDelete, setLayerToDelete] = useState<{ name: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute taken layer colors (case-insensitive)
  const usedLayerColors = useMemo(() => {
    return new Set(layers.map((l) => l.color.trim().toLowerCase()));
  }, [layers]);

  // Count events per layer
  const eventCountsByLayer = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((ev) => {
      const lyr = ((ev.layer && ev.layer.trim()) || "General").toLowerCase();
      counts.set(lyr, (counts.get(lyr) || 0) + 1);
    });
    return counts;
  }, [events]);

  // Set initial color for new layer to first free preset
  useEffect(() => {
    const firstFree = CANVAS_COLOR_PRESETS.find((p) => !usedLayerColors.has(p.hex.toLowerCase()));
    setNewLayerColor(firstFree ? firstFree.hex : CANVAS_COLOR_PRESETS[0].hex);
  }, [usedLayerColors]);

  // Handle Create Layer
  async function handleCreate() {
    const trimmed = newLayerName.trim();
    setCreateError(null);
    if (!trimmed) {
      setCreateError("Please enter a layer name.");
      return;
    }
    if (layers.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setCreateError(`A layer named "${trimmed}" already exists.`);
      return;
    }
    if (usedLayerColors.has(newLayerColor.toLowerCase())) {
      setCreateError("This color is already assigned to another layer.");
      return;
    }

    setCreating(true);
    try {
      await onCreateLayer(trimmed, newLayerColor);
      setNewLayerName("");
      const nextFree = CANVAS_COLOR_PRESETS.find(
        (p) => !usedLayerColors.has(p.hex.toLowerCase()) && p.hex.toLowerCase() !== newLayerColor.toLowerCase()
      );
      if (nextFree) setNewLayerColor(nextFree.hex);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create layer.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  // Handle Submit Rename
  async function handleSaveRename(oldName: string) {
    const trimmed = editRenameValue.trim();
    setRenameError(null);
    if (!trimmed) {
      setRenameError("Layer name cannot be empty.");
      return;
    }
    if (trimmed.toLowerCase() !== oldName.toLowerCase()) {
      if (layers.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
        setRenameError(`A layer named "${trimmed}" already exists.`);
        return;
      }
    }

    setRenaming(true);
    try {
      await onRenameLayer(oldName, trimmed);
      setRenamingLayerName(null);
      setEditRenameValue("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename layer.";
      setRenameError(msg);
    } finally {
      setRenaming(false);
    }
  }

  // Handle Execute Delete
  async function handleExecuteDelete(deleteEvents: boolean) {
    if (!layerToDelete) return;
    setDeleting(true);
    try {
      await onDeleteLayerWithOption(layerToDelete.name, deleteEvents);
      setLayerToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Main Layer Settings Modal Dialog */}
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl glass-panel border border-black/15 dark:border-white/15 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono theme-card-title flex items-center gap-2">
                <span>Layer Settings & Management</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 font-bold">
                  {layers.length}/16 Presets
                </span>
              </h2>
              <p className="text-[11px] theme-text-muted font-sans mt-0.5">
                Configure thematic layers, color schemes, reading hierarchy, and reordering.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg theme-pill flex items-center justify-center theme-text-muted hover:opacity-100 transition-colors cursor-pointer"
            title="Close Layer Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Section 1: Create a New Layer */}
          <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[#c9a84c]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#c9a84c]">
                <Plus className="w-3.5 h-3.5" />
                <span>Create a New Layer</span>
              </div>
              <span className="text-[10px] font-mono theme-text-muted">
                Each layer receives a unique color theme
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => {
                  setNewLayerName(e.target.value);
                  setCreateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Layer Name (e.g. Bronze Age, Classical Rome, Renaissance)"
                className="flex-1 px-3 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c] border border-black/10 dark:border-white/10"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newLayerName.trim() || layers.length >= 16}
                className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creating ? "Adding..." : "Add Layer"}</span>
              </button>
            </div>

            {createError && (
              <p className="text-[11px] font-mono text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{createError}</span>
              </p>
            )}

            {/* Choose Layer Color Theme (16 Presets Grid) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono theme-text-muted">
                <span>Choose Layer Color Scheme:</span>
                <span className="text-[10px] text-[#c9a84c] font-semibold">
                  {CANVAS_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === newLayerColor.toLowerCase())?.label || "Select Color"}
                </span>
              </div>
              <div className="grid grid-cols-8 gap-2 p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
                {CANVAS_COLOR_PRESETS.map((c) => {
                  const isUsed = usedLayerColors.has(c.hex.toLowerCase());
                  const isSelected = newLayerColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      disabled={isUsed}
                      onClick={() => {
                        setNewLayerColor(c.hex);
                        setCreateError(null);
                      }}
                      title={isUsed ? `${c.label} (Already used by another layer)` : c.label}
                      className={`h-7 rounded-lg transition-all relative flex items-center justify-center ${
                        isUsed
                          ? "opacity-25 cursor-not-allowed grayscale"
                          : isSelected
                          ? "ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-white dark:ring-offset-[#0d1527] scale-105 shadow-md cursor-pointer"
                          : "hover:scale-105 opacity-85 hover:opacity-100 cursor-pointer"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3]" />
                      )}
                      {isUsed && (
                        <span className="text-[9px] text-white font-bold leading-none select-none drop-shadow">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Timeline Layers List & Management */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-semibold theme-card-title flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Active Layers Hierarchy ({layers.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => onToggleAllLayers(true)}
                  className="px-2 py-0.5 rounded text-[#c9a84c] hover:bg-[#c9a84c]/10 cursor-pointer font-medium"
                >
                  Show All
                </button>
                <span className="opacity-30">|</span>
                <button
                  type="button"
                  onClick={() => onToggleAllLayers(false)}
                  className="px-2 py-0.5 rounded theme-text-muted hover:opacity-100 cursor-pointer"
                >
                  Hide All
                </button>
              </div>
            </div>

            <p className="text-[11px] theme-text-muted font-sans">
              Reorder layers using the up/down controls. Rename layers, customize layer color schemes, or manage events.
            </p>

            {renameError && (
              <p className="text-[11px] font-mono text-rose-500 flex items-center gap-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{renameError}</span>
              </p>
            )}

            {/* List of Layers */}
            <div className="space-y-2">
              {layers.map((layer, index) => {
                const normalizedLayerName = layer.name.trim().toLowerCase();
                const isGeneral = normalizedLayerName === "general";
                const isRenamingThis = renamingLayerName === layer.name;
                const isPickingColorThis = colorPickerLayerName === layer.name;
                const isActive = activeLayerNames.some((n) => n.trim().toLowerCase() === normalizedLayerName);
                const count = eventCountsByLayer.get(normalizedLayerName) ?? 0;

                return (
                  <div
                    key={layer.id || layer.name}
                    className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex flex-col gap-2 transition-all hover:border-black/20 dark:hover:border-white/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Move Up/Down Controls & Layer Badge */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Layer Up / Down buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onMoveLayer(index, "up")}
                            disabled={index === 0}
                            title="Move layer up"
                            className="w-5 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors text-slate-500 hover:text-[#c9a84c]"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveLayer(index, "down")}
                            disabled={index === layers.length - 1}
                            title="Move layer down"
                            className="w-5 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors text-slate-500 hover:text-[#c9a84c]"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Visibility Checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleLayer(layer.name)}
                          className="p-1 rounded cursor-pointer transition-transform active:scale-90"
                          title={isActive ? `Hide ${layer.name} on canvas` : `Show ${layer.name} on canvas`}
                        >
                          {isActive ? (
                            <CheckSquare className="w-4 h-4" style={{ color: layer.color }} />
                          ) : (
                            <Square className="w-4 h-4 opacity-40" />
                          )}
                        </button>

                        {/* Color Swatch Trigger */}
                        <button
                          type="button"
                          onClick={() => setColorPickerLayerName(isPickingColorThis ? null : layer.name)}
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-black/20 dark:border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          style={{ backgroundColor: layer.color }}
                          title={`Click to change color scheme for ${layer.name}`}
                        />

                        {/* Layer Name Display / Inline Rename Input */}
                        {isRenamingThis ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              value={editRenameValue}
                              onChange={(e) => setEditRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveRename(layer.name);
                                } else if (e.key === "Escape") {
                                  setRenamingLayerName(null);
                                }
                              }}
                              autoFocus
                              className="px-2.5 py-1 rounded-lg theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c] flex-1 border border-[#c9a84c]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(layer.name)}
                              disabled={renaming || !editRenameValue.trim()}
                              className="p-1 rounded bg-[#c9a84c] text-black hover:opacity-90 cursor-pointer"
                              title="Save Layer Name"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingLayerName(null)}
                              className="p-1 rounded theme-pill hover:opacity-100 cursor-pointer"
                              title="Cancel Rename"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-mono font-semibold theme-card-title truncate">
                              {layer.name}
                            </span>
                            {isGeneral && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 font-bold shrink-0">
                                Default
                              </span>
                            )}
                            {/* Rename Pencil Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingLayerName(layer.name);
                                setEditRenameValue(layer.name);
                                setRenameError(null);
                              }}
                              className="p-1 rounded opacity-60 hover:opacity-100 hover:text-[#c9a84c] transition-opacity cursor-pointer shrink-0"
                              title={`Rename "${layer.name}" layer`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: Event count & Layer Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 opacity-70">
                          {count} {count === 1 ? "event" : "events"}
                        </span>

                        {/* Layer Delete Button */}
                        {isGeneral ? (
                          <button
                            type="button"
                            disabled
                            className="p-1.5 opacity-20 cursor-not-allowed text-slate-400"
                            title="The default General layer cannot be deleted"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLayerToDelete({ name: layer.name, count })}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title={`Delete layer "${layer.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Color Scheme Picker when opened */}
                    {isPickingColorThis && (
                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[10px] font-mono theme-text-muted">
                          <span>Reassign Color Scheme:</span>
                          <button
                            type="button"
                            onClick={() => setColorPickerLayerName(null)}
                            className="hover:underline text-[10px] text-slate-400 cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid grid-cols-8 gap-1.5 p-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
                          {CANVAS_COLOR_PRESETS.map((c) => {
                            const isCurrent = layer.color.toLowerCase() === c.hex.toLowerCase();
                            const isUsedByOther = !isCurrent && usedLayerColors.has(c.hex.toLowerCase());
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                disabled={isUsedByOther}
                                onClick={async () => {
                                  await onChangeLayerColor(layer.name, c.hex);
                                  setColorPickerLayerName(null);
                                }}
                                title={isUsedByOther ? `${c.label} (in use)` : c.label}
                                className={`h-6 rounded-md transition-all relative flex items-center justify-center ${
                                  isUsedByOther
                                    ? "opacity-20 cursor-not-allowed grayscale"
                                    : isCurrent
                                    ? "ring-2 ring-[#c9a84c] ring-offset-1 ring-offset-white dark:ring-offset-[#0d1527] scale-105 shadow-sm"
                                    : "hover:scale-105 opacity-80 hover:opacity-100 cursor-pointer"
                                }`}
                                style={{ backgroundColor: c.hex }}
                              >
                                {isCurrent && (
                                  <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />
                                )}
                                {isUsedByOther && (
                                  <span className="text-[8px] text-white font-bold select-none">✕</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Canvas Display Preferences */}
          {onToggleGapBorder && (
            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold theme-card-title block">
                  Span Gap Badges
                </span>
                <span className="text-[11px] theme-text-muted font-sans">
                  Show distance badges between consecutive milestones on the timeline.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleGapBorder(!showGapBorder)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold cursor-pointer border transition-all ${
                  showGapBorder
                    ? "bg-[#c9a84c]/20 border-[#c9a84c] text-[#c9a84c]"
                    : "theme-pill text-slate-400"
                }`}
              >
                {showGapBorder ? "Visible" : "Hidden"}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>

      </div>

      {/* Layer Delete Confirmation Modal (Choice between Delete All Events vs Move to General) */}
      {layerToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl glass-panel p-5 border border-rose-500/30 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-rose-500">
                  Delete Layer: &ldquo;{layerToDelete.name}&rdquo;
                </h3>
                <p className="text-[11px] theme-text-muted font-sans">
                  This layer contains <span className="font-bold text-[#f5f0e8]">{layerToDelete.count}</span> event{layerToDelete.count === 1 ? "" : "s"}.
                </p>
              </div>
            </div>

            <p className="text-xs theme-text-muted font-sans leading-relaxed">
              How would you like to handle the events and periods belonging to this layer?
            </p>

            <div className="space-y-2 pt-1">
              {/* Option 1: Delete Layer Only (Move events to General) */}
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleExecuteDelete(false)}
                className="w-full p-3 rounded-xl bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#c9a84c] mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Delete Layer Only (Keep Events)</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#c9a84c]/20 text-[#c9a84c] font-bold">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] theme-text-muted font-sans">
                  Safely moves all {layerToDelete.count} event{layerToDelete.count === 1 ? "" : "s"} into the default &ldquo;General&rdquo; layer so no historical data is lost.
                </p>
              </button>

              {/* Option 2: Delete Layer and All Events */}
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleExecuteDelete(true)}
                className="w-full p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-rose-500 mb-0.5">
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Layer & All Events</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 font-bold">
                    Destructive
                  </span>
                </div>
                <p className="text-[11px] theme-text-muted font-sans">
                  Permanently deletes the layer and removes all {layerToDelete.count} event{layerToDelete.count === 1 ? "" : "s"} inside it from this timeline.
                </p>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.08] dark:border-white/[0.08]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setLayerToDelete(null)}
                className="px-4 py-1.5 rounded-xl theme-pill text-xs font-mono cursor-pointer hover:opacity-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Trash2,
  X,
  Sparkles,
  Layers,
  Plus,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export interface LayerItem {
  id: string;
  name: string;
  color: string;
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
}

interface EventFormProps {
  initialData?: EventFormData;
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
  availableLayers = [],
  onCreateLayer,
  onSave,
  onDelete,
  onClose,
}: EventFormProps) {
  const [year, setYear] = useState(initialData?.year?.toString() || "");
  const [isBce, setIsBce] = useState(initialData?.isBce || false);
  const [month, setMonth] = useState(initialData?.month || "");
  const [day, setDay] = useState(initialData?.day || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#c9a84c");
  const [selectedLayer, setSelectedLayer] = useState(
    initialData?.layer || (availableLayers[0]?.name ?? "General")
  );

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(year, 10);
    if (isNaN(parsed) || !title.trim()) return;
    const yearNum = Math.abs(parsed);

    setSaving(true);
    await onSave({
      id: initialData?.id,
      year: yearNum,
      isBce,
      month: month || "",
      day: day || "",
      title: title.trim(),
      description: description.trim(),
      color,
      layer: selectedLayer.trim() || "General",
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

  // Live formatted date label preview
  const previewDate = () => {
    const parsed = parseInt(year, 10);
    const y = !isNaN(parsed) ? Math.abs(parsed).toLocaleString() : "0";
    const era = isBce ? "BCE" : "CE";
    if (month && day) return `${month}/${day}, ${y} ${era}`;
    if (month) return `M${month}, ${y} ${era}`;
    return `${y} ${era}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      // Backdrop click intentionally does NOT close the modal: ONLY 'X' closes it
    >
      <div
        className="w-full max-w-lg rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isEditing ? "Edit Chronicle Milestone" : "Add Chronicle Milestone"}
              </h2>
              <p className="text-[11px] font-mono theme-text-muted">
                Temporal coordinate and historical milestone
              </p>
            </div>
          </div>

          {/* Close X Button: ONLY this button closes the modal */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Interactive Card Preview */}
        <div className="px-6 pt-5 pb-3 bg-gradient-to-b from-black/[0.02] dark:from-white/[0.02] to-transparent">
          <div className="text-[10px] font-mono uppercase tracking-wider theme-text-muted mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Canvas Milestone Preview</span>
            </span>
            <span className="text-[10px] text-[#c9a84c] font-semibold">
              Layer: {selectedLayer || "General"}
            </span>
          </div>
          <div
            className="p-3.5 rounded-xl bg-black/[0.04] dark:bg-[#070c16]/80 border flex items-center justify-between gap-3 shadow-inner transition-colors duration-200"
            style={{ borderColor: `${color}80` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3.5 h-8 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold theme-card-title truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title.trim() || "Milestone Title"}
                </div>
                <div
                  className="text-[11px] font-mono font-medium"
                  style={{ color }}
                >
                  {previewDate()}
                </div>
              </div>
            </div>
            <div
              className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border shrink-0"
              style={{
                borderColor: `${color}60`,
                backgroundColor: `${color}18`,
                color,
              }}
            >
              {isBce ? "BCE Era" : "Common Era"}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
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
                    placeholder="Period Name (e.g. Bronze Age, Period A)"
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
                <select
                  value={selectedLayer}
                  onChange={(e) => {
                    const lyr = e.target.value;
                    setSelectedLayer(lyr);
                    const found = availableLayers.find((l) => l.name === lyr);
                    if (found) setColor(found.color);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all cursor-pointer"
                >
                  {availableLayers.length > 0 ? (
                    availableLayers.map((l) => (
                      <option key={l.id || l.name} value={l.name}>
                        {l.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="General">General Chronicle</option>
                      <option value="Period A">Period A</option>
                      <option value="Period B">Period B</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Era and Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Era Toggle */}
            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Era
              </label>
              <div className="flex rounded-xl bg-black/[0.04] dark:bg-white/[0.04] p-1 border border-black/10 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsBce(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
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
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1776, 44, 2500"
                required
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
              />
            </div>
          </div>

          {/* Month & Day (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Month <span className="opacity-60">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="1 – 12"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Day <span className="opacity-60">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="1 – 31"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Declaration of Independence"
              required
              className="w-full px-3.5 py-2 rounded-xl theme-input text-sm outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
              Chronicle Notes <span className="opacity-60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Historical context, participants, or significant outcomes..."
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl theme-input text-xs outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 resize-none transition-all leading-relaxed font-light"
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-2 font-medium">
              Milestone Chromatic Accent
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PALETTE.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-7 h-7 rounded-xl transition-all relative flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "scale-110 ring-2 ring-offset-2 ring-[#c9a84c] ring-offset-white dark:ring-offset-[#0d1527] shadow-md"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
                className="px-4 py-2 rounded-xl theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !title.trim() || !year.trim()}
                className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <span>{isEditing ? "Update Milestone" : "Add to Number Line"}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Milestone Deletion */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Chronicle Milestone"
        message={`Are you sure you want to remove "${title || "this milestone"}" from the chronicle number line?`}
        confirmLabel="Delete Milestone"
        cancelLabel="Keep Milestone"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleExecuteDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Trash2,
  X,
  Check,
  Sparkles,
} from "lucide-react";

interface EventFormData {
  id?: string;
  year: number;
  isBce: boolean;
  month: string;
  day: string;
  title: string;
  description: string;
  color: string;
}

interface EventFormProps {
  initialData?: EventFormData;
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
];

export default function EventForm({
  initialData,
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
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData?.id;

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || !title.trim()) return;

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
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
  }

  // Live formatted date label preview
  const previewDate = () => {
    const y = year.trim() ? parseInt(year).toLocaleString() : "0";
    const era = isBce ? "BCE" : "CE";
    if (month && day) return `${month}/${day}, ${y} ${era}`;
    if (month) return `M${month}, ${y} ${era}`;
    return `${y} ${era}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/[0.1] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold text-[#f5f0e8] leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {isEditing ? "Edit Milestone" : "Add Chronicle Milestone"}
              </h2>
              <p className="text-[11px] font-mono text-[#f5f0e8]/40">
                Temporal coordinate on the number line
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#f5f0e8]/40 hover:text-[#f5f0e8] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Interactive Card Preview */}
        <div className="px-6 pt-5 pb-3 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#f5f0e8]/30 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#c9a84c]" />
            <span>Canvas Representation Preview</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3 h-8 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold text-[#f5f0e8] truncate"
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
              className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border shrink-0"
              style={{
                borderColor: `${color}40`,
                backgroundColor: `${color}15`,
                color,
              }}
            >
              {isBce ? "BCE Era" : "Common Era"}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Era and Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Era Toggle */}
            <div>
              <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
                Era
              </label>
              <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsBce(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isBce
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                      : "text-[#f5f0e8]/40 hover:text-[#f5f0e8]"
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
                      : "text-[#f5f0e8]/40 hover:text-[#f5f0e8]"
                  }`}
                >
                  CE
                </button>
              </div>
            </div>

            {/* Year Input */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
                Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1776, 44, 2500"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-[#f5f0e8] text-xs font-mono outline-none focus:border-[#c9a84c]/70 focus:ring-1 focus:ring-[#c9a84c]/30 placeholder:text-[#f5f0e8]/20 transition-all"
              />
            </div>
          </div>

          {/* Month & Day (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
                Month <span className="text-[#f5f0e8]/25">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="1 – 12"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-[#f5f0e8] text-xs font-mono outline-none focus:border-[#c9a84c]/70 focus:ring-1 focus:ring-[#c9a84c]/30 placeholder:text-[#f5f0e8]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
                Day <span className="text-[#f5f0e8]/25">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="1 – 31"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-[#f5f0e8] text-xs font-mono outline-none focus:border-[#c9a84c]/70 focus:ring-1 focus:ring-[#c9a84c]/30 placeholder:text-[#f5f0e8]/20 transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Declaration of Independence"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c]/70 focus:ring-1 focus:ring-[#c9a84c]/30 placeholder:text-[#f5f0e8]/20 transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-1.5">
              Chronicle Notes <span className="text-[#f5f0e8]/25">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Historical context, participants, or significant outcomes..."
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-[#f5f0e8] text-xs outline-none focus:border-[#c9a84c]/70 focus:ring-1 focus:ring-[#c9a84c]/30 placeholder:text-[#f5f0e8]/20 resize-none transition-all leading-relaxed font-light"
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/50 uppercase tracking-wider mb-2">
              Color Coordinate
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    color === c.hex
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#070c16] scale-110 shadow-md"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {color === c.hex && <Check className="w-3 h-3 text-[#070c16] stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-300 text-xs font-mono hover:bg-rose-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !title.trim() || !year}
              className="flex-1 btn-gold py-2.5 px-4 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#070c16]/40 border-t-[#070c16] rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Update Milestone" : "Add to Number Line"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

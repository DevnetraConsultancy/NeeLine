"use client";

import { useState, useEffect, useRef } from "react";

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
  "#c9a84c", // brass/gold
  "#e8d5a3", // light gold
  "#7ab8a0", // sage green
  "#5a9bd5", // steel blue
  "#d4786c", // terracotta
  "#b07cc6", // lavender
  "#e8a87c", // peach
  "#7cc6d4", // teal
  "#d4a5c9", // rose
  "#a8b87a", // olive
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
    // Focus title input on mount
    setTimeout(() => titleRef.current?.focus(), 100);
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
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md mx-4 rounded-xl bg-[#0f1f38] border border-[#c9a84c]/20 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#c9a84c]/10">
          <h2
            className="text-lg font-semibold text-[#f5f0e8]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isEditing ? "Edit Event" : "Add Event"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#f5f0e8]/30 hover:text-[#f5f0e8]/60 hover:bg-[#c9a84c]/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Year + CE/BCE */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2004"
                required
                className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-[#c9a84c]/20 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] placeholder:text-[#f5f0e8]/20"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div>
              <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
                Era
              </label>
              <button
                type="button"
                onClick={() => setIsBce(!isBce)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  isBce
                    ? "bg-[#c94c4c]/20 border-[#c94c4c]/40 text-[#c94c4c]"
                    : "bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {isBce ? "BCE" : "CE"}
              </button>
            </div>
          </div>

          {/* Month + Day (optional) */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
                Month <span className="text-[#f5f0e8]/20">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="1-12"
                className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-[#c9a84c]/20 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] placeholder:text-[#f5f0e8]/20"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
                Day <span className="text-[#f5f0e8]/20">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="1-31"
                className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-[#c9a84c]/20 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] placeholder:text-[#f5f0e8]/20"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-[#c9a84c]/20 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] placeholder:text-[#f5f0e8]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
              Description <span className="text-[#f5f0e8]/20">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this event..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-[#c9a84c]/20 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c] placeholder:text-[#f5f0e8]/20 resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-1.5 uppercase tracking-wider">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c
                      ? "border-white scale-110"
                      : "border-transparent hover:border-white/30"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim() || !year}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#c9a84c] text-[#0a1628] font-semibold text-sm hover:bg-[#d4b65a] transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : isEditing ? "Update" : "Add Event"}
            </button>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg border border-[#c94c4c]/30 text-[#c94c4c] text-sm hover:bg-[#c94c4c]/10 transition-colors disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

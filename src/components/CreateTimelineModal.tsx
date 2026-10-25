"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Sparkles, FileText, Compass } from "lucide-react";

interface CreateTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CreateTimelineModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: CreateTimelineModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed, description.trim());
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with X button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Create New Timeline
              </h2>
              <p className="text-[11px] font-mono theme-text-muted">
                Define the historical scope and chronicle parameters
              </p>
            </div>
          </div>

          {/* Close X button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            title="Close (X)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium flex items-center justify-between">
              <span>
                Timeline Name <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] opacity-60">Required</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rise of the Roman Republic, History of Computing..."
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl theme-input text-sm outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-[#c9a84c]" />
                <span>Description / Scope</span>
              </span>
              <span className="text-[10px] opacity-60">Optional</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide historical context, overarching themes, or geographical boundaries for this timeline..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl theme-input text-xs outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 resize-none transition-all leading-relaxed font-light"
            />
          </div>

          {/* Subtle Tip */}
          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2.5 text-[11px] font-mono theme-text-muted">
            <Sparkles className="w-3.5 h-3.5 text-[#c9a84c] shrink-0" />
            <span>
              You will be able to add custom chronological layers and milestones once the studio opens.
            </span>
          </div>

          {/* Footer Actions: Discard & Create Button */}
          <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Discard
            </button>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#070c16]/40 border-t-[#070c16] rounded-full animate-spin" />
                  <span>Creating Studio...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Timeline</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

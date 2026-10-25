"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X, Sparkles, Copy, Check, Edit3, Save } from "lucide-react";

interface ChronicleNotesModalProps {
  isOpen: boolean;
  timelineName: string;
  notes: string;
  eventsCount: number;
  spanCount: number;
  layersCount: number;
  earliestDate?: string;
  latestDate?: string;
  onSaveNotes?: (updatedNotes: string) => Promise<void>;
  onClose: () => void;
}

export default function ChronicleNotesModal({
  isOpen,
  timelineName,
  notes,
  eventsCount,
  spanCount,
  layersCount,
  earliestDate,
  latestDate,
  onSaveNotes,
  onClose,
}: ChronicleNotesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(notes || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setContent(notes || "");
  }, [notes]);

  if (!isOpen || !mounted) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content || notes || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!onSaveNotes) return;
    setSaving(true);
    try {
      await onSaveNotes(content.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.12] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(201,168,76,0.2)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight truncate max-w-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {timelineName}
              </h2>
              <p className="text-[11px] font-mono text-[#c9a84c] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Chronicle Scope & Archival Notes</span>
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

        {/* Studio Summary Metrics */}
        <div className="px-6 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
            <span className="text-[10px] theme-text-muted block font-sans">Milestones</span>
            <span className="font-bold text-[#c9a84c]">{eventsCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
            <span className="text-[10px] theme-text-muted block font-sans">Bracket Periods</span>
            <span className="font-bold text-[#38bdf8]">{spanCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
            <span className="text-[10px] theme-text-muted block font-sans">Active Layers</span>
            <span className="font-bold text-[#10b981]">{layersCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
            <span className="text-[10px] theme-text-muted block font-sans truncate">Era Range</span>
            <span className="font-bold text-[11px] theme-card-title truncate block">
              {earliestDate || "Antiquity"} → {latestDate || "Modern"}
            </span>
          </div>
        </div>

        {/* Body / Chronicle Notes Narrative */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono theme-text-muted uppercase tracking-wider font-semibold">
              Historical Overview & Scope
            </span>

            <div className="flex items-center gap-2">
              {!isEditing && onSaveNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg theme-pill hover:border-[#c9a84c]/60 text-xs font-mono transition-colors cursor-pointer text-[#c9a84c]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Notes</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg theme-pill hover:border-[#c9a84c]/60 text-xs font-mono transition-colors cursor-pointer"
                title="Copy chronicle notes"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Write overarching historical context, chronicle scope, primary source citations, and thematic guidelines..."
                className="w-full p-4 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all leading-relaxed resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContent(notes || "");
                    setIsEditing(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-gold px-4 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Notes"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.08] min-h-[140px] text-xs leading-relaxed font-sans font-light theme-card-title whitespace-pre-wrap">
              {content.trim() ? (
                content
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center theme-text-muted">
                  <BookOpen className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-xs font-mono">No chronicle scope notes added yet.</p>
                  <p className="text-[11px] font-sans mt-1">
                    Click &quot;Edit Notes&quot; to define the overarching historical framework and narrative.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between text-xs font-mono bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-[10px] theme-text-muted">
            NeeLine Studio • Academic Chronology
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

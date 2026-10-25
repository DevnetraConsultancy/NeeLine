"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowUpRight,
  Trash2,
  RotateCcw,
  Edit2,
  Check,
  X,
} from "lucide-react";

interface TimelineItem {
  id: string;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bgColor: string;
  spineColor: string;
  tickColor?: string;
  textColor?: string;
  _count: { events: number };
}

interface TimelineCardProps {
  timeline: TimelineItem;
  onUpdate: () => void;
  onTrash: (timeline: TimelineItem) => void;
  onPermanentDelete: (timeline: TimelineItem) => void;
}

export default function TimelineCard({
  timeline,
  onUpdate,
  onTrash,
  onPermanentDelete,
}: TimelineCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(timeline.name);
  const [saving, setSaving] = useState(false);

  const isTrashed = !!timeline.deletedAt;
  const eventCount = timeline._count.events;
  const date = new Date(timeline.updatedAt);
  const timeAgo = formatTimeAgo(date);

  async function handleRename() {
    if (!name.trim() || name === timeline.name) {
      setName(timeline.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    await fetch(`/api/timelines?id=${timeline.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    setEditing(false);
    onUpdate();
  }

  async function handleRestore() {
    await fetch(`/api/timelines?id=${timeline.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletedAt: null }),
    });
    onUpdate();
  }

  return (
    <div className="group relative rounded-2xl theme-card overflow-hidden flex flex-col justify-between transition-all duration-300">
      {/* Top spine bar with timeline's custom spine color */}
      <div
        className="h-1.5 w-full relative"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${timeline.spineColor} 50%, transparent 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-40 blur-xs"
          style={{ backgroundColor: timeline.spineColor }}
        />
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Title & quick color dot */}
          <div className="flex items-start justify-between gap-3 mb-2">
            {editing ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") {
                      setName(timeline.name);
                      setEditing(false);
                    }
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg theme-input text-sm font-semibold outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  disabled={saving}
                />
                <button
                  onClick={handleRename}
                  disabled={saving}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer"
                  title="Confirm rename"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setName(timeline.name);
                    setEditing(false);
                  }}
                  className="p-1 opacity-50 hover:opacity-100 rounded cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title flex-1 min-w-0">
                <h3
                  className="text-base font-semibold theme-card-title truncate cursor-pointer group-hover/title:text-[#c9a84c] transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}
                  onClick={() => setEditing(true)}
                  title="Click to rename"
                >
                  {timeline.name}
                </h3>
                <button
                  onClick={() => setEditing(true)}
                  className="opacity-0 group-hover:opacity-100 theme-text-subtle hover:text-[#c9a84c] transition-opacity p-0.5 cursor-pointer"
                  title="Rename timeline"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Timeline Color Swatch Badge */}
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shrink-0 shadow-sm"
              style={{ backgroundColor: timeline.spineColor }}
              title={`Spine color: ${timeline.spineColor}`}
            />
          </div>

          {/* Metadata chips */}
          <div className="flex items-center gap-3 text-xs font-mono theme-text-muted mt-3">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md theme-pill">
              <Calendar className="w-3 h-3 text-[#c9a84c]" />
              <span>
                {eventCount} {eventCount === 1 ? "event" : "events"}
              </span>
            </span>
            <span className="flex items-center gap-1 opacity-70">
              <Clock className="w-3 h-3" />
              <span>{timeAgo}</span>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
          {isTrashed ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleRestore}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] hover:bg-[#c9a84c]/25 border border-[#c9a84c]/30 font-medium transition-colors cursor-pointer font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
              <button
                onClick={() => onPermanentDelete(timeline)}
                className="flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 font-medium transition-colors cursor-pointer font-mono"
                title="Permanently remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                href={`/timeline/${timeline.id}`}
                className="flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-lg btn-ghost-gold font-medium transition-all group/btn cursor-pointer font-mono"
              >
                <span>Open Canvas</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
              </Link>

              <button
                onClick={() => onTrash(timeline)}
                className="p-1.5 opacity-40 hover:opacity-100 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                title="Move to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

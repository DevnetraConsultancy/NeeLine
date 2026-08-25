"use client";

import { useState } from "react";
import Link from "next/link";

interface TimelineCardProps {
  timeline: {
    id: string;
    name: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    bgColor: string;
    spineColor: string;
    _count: { events: number };
  };
  onUpdate: () => void;
}

export default function TimelineCard({ timeline, onUpdate }: TimelineCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(timeline.name);
  const [saving, setSaving] = useState(false);

  const isTrashed = !!timeline.deletedAt;
  const eventCount = timeline._count.events;
  const date = new Date(timeline.updatedAt);
  const timeAgo = formatTimeAgo(date);

  async function handleRename() {
    if (!name.trim() || name === timeline.name) {
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

  async function handlePermanentDelete() {
    if (!confirm("Permanently delete this timeline? This cannot be undone.")) return;
    await fetch(`/api/timelines?id=${timeline.id}&permanent=true`, {
      method: "DELETE",
    });
    onUpdate();
  }

  async function handleSoftDelete() {
    if (!confirm("Move this timeline to trash?")) return;
    await fetch(`/api/timelines?id=${timeline.id}`, {
      method: "DELETE",
    });
    onUpdate();
  }

  return (
    <div className="group relative rounded-lg border border-[#c9a84c]/15 bg-[#0f1f38]/60 hover:bg-[#0f1f38] hover:border-[#c9a84c]/30 transition-all overflow-hidden">
      {/* Color bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: timeline.spineColor }}
      />

      <div className="p-4">
        {/* Name */}
        {editing ? (
          <div className="flex gap-2">
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
              onBlur={handleRename}
              className="flex-1 px-2 py-1 rounded bg-[#0a1628] border border-[#c9a84c]/30 text-[#f5f0e8] text-sm outline-none focus:border-[#c9a84c]"
              disabled={saving}
            />
          </div>
        ) : (
          <h3
            className="text-base font-semibold text-[#f5f0e8] truncate cursor-pointer hover:text-[#c9a84c] transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {timeline.name}
          </h3>
        )}

        {/* Meta */}
        <div className="mt-2 flex items-center gap-3 text-xs text-[#f5f0e8]/40">
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          {isTrashed ? (
            <>
              <button
                onClick={handleRestore}
                className="text-xs px-3 py-1 rounded bg-[#c9a84c]/20 text-[#c9a84c] hover:bg-[#c9a84c]/30 transition-colors"
              >
                Restore
              </button>
              <button
                onClick={handlePermanentDelete}
                className="text-xs px-3 py-1 rounded bg-[#c94c4c]/20 text-[#c94c4c] hover:bg-[#c94c4c]/30 transition-colors"
              >
                Delete forever
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/timeline/${timeline.id}`}
                className="text-xs px-3 py-1 rounded bg-[#c9a84c]/20 text-[#c9a84c] hover:bg-[#c9a84c]/30 transition-colors"
              >
                Open
              </Link>
              <button
                onClick={handleSoftDelete}
                className="text-xs px-3 py-1 rounded text-[#f5f0e8]/30 hover:text-[#c94c4c] hover:bg-[#c94c4c]/10 transition-colors"
              >
                Trash
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

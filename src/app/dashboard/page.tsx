"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TimelineCard from "@/components/TimelineCard";
import CreateTimelineModal from "@/components/CreateTimelineModal";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, Search, Layers, Trash2, Sparkles } from "lucide-react";

interface Timeline {
  id: string;
  name: string;
  description?: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bgColor: string;
  spineColor: string;
  _count: { events: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [trashTimelines, setTrashTimelines] = useState<Timeline[]>([]);
  const [tab, setTab] = useState<"all" | "trash">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "trash" | "delete";
    timeline: Timeline;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTimelines = useCallback(async () => {
    try {
      const [allRes, trashRes] = await Promise.all([
        fetch("/api/timelines"),
        fetch("/api/timelines?trash=true"),
      ]);
      if (allRes.ok) {
        const list: Timeline[] = await allRes.json();
        const enriched = list.map((t) => ({
          ...t,
          description:
            t.description ||
            (typeof window !== "undefined"
              ? localStorage.getItem(`neeline_desc_${t.id}`)
              : null),
        }));
        setTimelines(enriched);
      }
      if (trashRes.ok) setTrashTimelines(await trashRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  async function handleCreateTimeline(name: string, description: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/timelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const timeline = await res.json();
        if (description) {
          localStorage.setItem(`neeline_desc_${timeline.id}`, description);
        }
        setShowCreateModal(false);
        router.push(`/timeline/${timeline.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Failed to create chronicle. Please verify your connection or session.");
      }
    } catch {
      setErrorMessage("Network error occurred while creating chronicle. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const url =
        confirmAction.type === "delete"
          ? `/api/timelines?id=${confirmAction.timeline.id}&permanent=true`
          : `/api/timelines?id=${confirmAction.timeline.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete timeline");
      }
      setConfirmAction(null);
      await fetchTimelines();
    } catch {
      setErrorMessage(
        confirmAction.type === "delete"
          ? "Failed to permanently delete timeline. Please try again."
          : "Failed to move timeline to trash. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const baseList = tab === "all" ? timelines : trashTimelines;

  const filteredTimelines = useMemo(() => {
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [baseList, searchQuery]);

  return (
    <div className="min-h-screen theme-bg flex flex-col relative overflow-x-hidden selection:bg-[#c9a84c]/30">
      <Navbar />

      {/* Luminous Ambient background glows */}
      <div className="ambient-glow w-[550px] h-[550px] bg-[#c9a84c] top-[40px] right-[10%] opacity-15" />
      <div className="ambient-glow w-[450px] h-[450px] bg-[#4361ee] bottom-[15%] left-[5%] opacity-15" />
      <div className="ambient-glow w-[380px] h-[380px] bg-[#e056fd] top-[40%] left-[20%] opacity-10" />

      {/* Content wrapper */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-24 pb-16 relative z-10 flex flex-col">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Dashboard</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your Timelines
            </h1>
            <p className="text-sm theme-text-muted mt-1 font-light">
              Manage, organize, and craft historical chronicles on high-precision number lines.
            </p>
          </div>

          {/* New Timeline Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 font-mono tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Timeline</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Segmented View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 my-6">
          {/* Segmented Tab Control */}
          <div className="flex items-center p-1 rounded-xl theme-pill w-fit font-mono text-xs">
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "all"
                  ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-sm"
                  : "theme-text-muted hover:opacity-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] font-bold">
                {timelines.length}
              </span>
            </button>

            <button
              onClick={() => setTab("trash")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "trash"
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 font-semibold shadow-sm"
                  : "theme-text-muted hover:opacity-100"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
              {trashTimelines.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-500 font-bold">
                  {trashTimelines.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timelines..."
              className="w-full pl-9 pr-4 py-2 rounded-xl theme-input text-xs font-mono outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/40 transition-all"
            />
          </div>
        </div>

        {/* Timeline Grid or Empty State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin mb-4" />
            <p className="text-xs font-mono theme-text-muted">Loading timelines...</p>
          </div>
        ) : filteredTimelines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl glass-panel border border-dashed border-black/10 dark:border-white/[0.08] my-4">
            <div className="w-16 h-16 rounded-2xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center mb-5 text-[#c9a84c]">
              <Layers className="w-8 h-8 opacity-75" />
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {searchQuery
                ? "No matching timelines found"
                : tab === "all"
                ? "Begin Your First Chronicle"
                : "Trash is empty"}
            </h3>
            <p className="text-xs theme-text-muted max-w-sm mb-6 font-light leading-relaxed">
              {searchQuery
                ? `No timelines match "${searchQuery}". Try clearing your search query.`
                : tab === "all"
                ? "Plot historical events, ancient epochs, or modern chronologies with horizontal mathematical elegance."
                : "Deleted timelines will appear here before permanent erasure."}
            </p>
            {tab === "all" && !searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={creating}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer font-mono font-semibold"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Timeline</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTimelines.map((timeline) => (
              <TimelineCard
                key={timeline.id}
                timeline={timeline}
                onUpdate={fetchTimelines}
                onTrash={(t) => setConfirmAction({ type: "trash", timeline: t })}
                onPermanentDelete={(t) => setConfirmAction({ type: "delete", timeline: t })}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] text-center">
          <p className="text-xs font-mono theme-text-muted">
            Developed in Collaboration with Academia | Devnetra Consultancy
          </p>
        </div>
      </div>

      {/* In-Viewport Create Timeline Modal */}
      <CreateTimelineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTimeline}
        isLoading={creating}
      />

      {/* Error Modal */}
      <ConfirmModal
        isOpen={errorMessage !== null}
        title="Notice"
        message={errorMessage || ""}
        confirmLabel="Understood"
        cancelLabel="Close"
        isDestructive={false}
        onConfirm={() => setErrorMessage(null)}
        onClose={() => setErrorMessage(null)}
      />

      {/* Confirmation Modal for Moving to Trash or Permanent Erasure */}
      <ConfirmModal
        isOpen={confirmAction !== null}
        title={
          confirmAction?.type === "delete"
            ? "Permanently Delete Timeline"
            : "Move Timeline to Trash"
        }
        message={
          confirmAction?.type === "delete"
            ? `Are you sure you want to permanently delete "${confirmAction.timeline.name}"? This action cannot be reversed and all chronological events will be erased.`
            : `Are you sure you want to move "${confirmAction?.timeline.name}" to the trash? You can restore it later from the Trash tab.`
        }
        confirmLabel={
          confirmAction?.type === "delete" ? "Delete Permanently" : "Move to Trash"
        }
        cancelLabel="Keep Timeline"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TimelineCard from "@/components/TimelineCard";
import { Plus, Search, Layers, Trash2, Sparkles } from "lucide-react";

interface Timeline {
  id: string;
  name: string;
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
  const [creating, setCreating] = useState(false);

  const fetchTimelines = useCallback(async () => {
    try {
      const [allRes, trashRes] = await Promise.all([
        fetch("/api/timelines"),
        fetch("/api/timelines?trash=true"),
      ]);
      if (allRes.ok) setTimelines(await allRes.json());
      if (trashRes.ok) setTrashTimelines(await trashRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  async function handleNewTimeline() {
    setCreating(true);
    try {
      const res = await fetch("/api/timelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Timeline" }),
      });
      if (res.ok) {
        const timeline = await res.json();
        router.push(`/timeline/${timeline.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  const baseList = tab === "all" ? timelines : trashTimelines;

  const filteredTimelines = useMemo(() => {
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase();
    return baseList.filter((t) => t.name.toLowerCase().includes(q));
  }, [baseList, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070c16] text-[#f5f0e8] flex flex-col relative overflow-x-hidden selection:bg-[#c9a84c]/30">
      <Navbar />

      {/* Ambient background glows */}
      <div className="ambient-glow w-[500px] h-[500px] bg-[#c9a84c] top-[40px] right-[10%] opacity-10" />
      <div className="ambient-glow w-[400px] h-[400px] bg-[#22487a] bottom-[10%] left-[5%] opacity-10" />

      {/* Content wrapper */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-24 pb-16 relative z-10 flex flex-col">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Dashboard</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f0e8]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your Timelines
            </h1>
            <p className="text-sm text-[#f5f0e8]/50 mt-1 font-light">
              Manage, organize, and craft historical chronicles on high-precision number lines.
            </p>
          </div>

          {/* New Timeline Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewTimeline}
              disabled={creating}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 font-mono tracking-wide"
            >
              {creating ? (
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
        </div>

        {/* Toolbar: Search & Segmented View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 my-6">
          {/* Segmented Tab Control */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] w-fit font-mono text-xs">
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "all"
                  ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 shadow-sm"
                  : "text-[#f5f0e8]/50 hover:text-[#f5f0e8]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[#f5f0e8]/70">
                {timelines.length}
              </span>
            </button>

            <button
              onClick={() => setTab("trash")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "trash"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-[#f5f0e8]/50 hover:text-[#f5f0e8]"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
              {trashTimelines.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300">
                  {trashTimelines.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#f5f0e8]/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timelines..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-[#f5f0e8] placeholder:text-[#f5f0e8]/25 outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/30 transition-all"
            />
          </div>
        </div>

        {/* Timeline Grid or Empty State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin mb-4" />
            <p className="text-xs font-mono text-[#f5f0e8]/40">Loading timelines...</p>
          </div>
        ) : filteredTimelines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl glass-panel border border-dashed border-white/[0.08] my-4">
            <div className="w-16 h-16 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mb-5 text-[#c9a84c]">
              <Layers className="w-8 h-8 opacity-70" />
            </div>
            <h3
              className="text-xl font-bold text-[#f5f0e8] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {searchQuery
                ? "No matching timelines found"
                : tab === "all"
                ? "Begin Your First Chronicle"
                : "Trash is empty"}
            </h3>
            <p className="text-xs text-[#f5f0e8]/50 max-w-sm mb-6 font-light leading-relaxed">
              {searchQuery
                ? `No timelines match "${searchQuery}". Try clearing your search query.`
                : tab === "all"
                ? "Plot historical events, ancient epochs, or modern chronologies with horizontal mathematical elegance."
                : "Deleted timelines will appear here before permanent erasure."}
            </p>
            {tab === "all" && !searchQuery && (
              <button
                onClick={handleNewTimeline}
                disabled={creating}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer font-mono"
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

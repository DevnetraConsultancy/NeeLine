"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TimelineCard from "@/components/TimelineCard";

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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchTimelines = useCallback(async () => {
    const [allRes, trashRes] = await Promise.all([
      fetch("/api/timelines"),
      fetch("/api/timelines?trash=true"),
    ]);
    if (allRes.ok) setTimelines(await allRes.json());
    if (trashRes.ok) setTrashTimelines(await trashRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  async function handleNewTimeline() {
    setCreating(true);
    const res = await fetch("/api/timelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Timeline" }),
    });
    if (res.ok) {
      const timeline = await res.json();
      router.push(`/timeline/${timeline.id}`);
    }
    setCreating(false);
  }

  const displayTimelines = tab === "all" ? timelines : trashTimelines;

  return (
    <div className="h-screen bg-[#0a1628] flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-2xl font-bold text-[#f5f0e8]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your Timelines
              </h1>
              <p className="text-sm text-[#f5f0e8]/40 mt-1">
                {timelines.length} timeline{timelines.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={handleNewTimeline}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-[#c9a84c] text-[#0a1628] font-semibold text-sm hover:bg-[#d4b65a] transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "+ New Timeline"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-[#c9a84c]/10">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                tab === "all"
                  ? "border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-[#f5f0e8]/40 hover:text-[#f5f0e8]/60"
              }`}
            >
              All
              {timelines.length > 0 && (
                <span className="ml-1.5 text-[#c9a84c]/50">{timelines.length}</span>
              )}
            </button>
            <button
              onClick={() => setTab("trash")}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                tab === "trash"
                  ? "border-[#c94c4c] text-[#c94c4c]"
                  : "border-transparent text-[#f5f0e8]/40 hover:text-[#f5f0e8]/60"
              }`}
            >
              Trash
              {trashTimelines.length > 0 && (
                <span className="ml-1.5 text-[#c94c4c]/50">{trashTimelines.length}</span>
              )}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-20 text-[#f5f0e8]/30">Loading...</div>
          ) : displayTimelines.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-[#c9a84c]/20 mb-4">
                <svg
                  viewBox="0 0 48 48"
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <circle cx="24" cy="24" r="4" />
                  <line x1="4" y1="24" x2="44" y2="24" />
                  <line x1="24" y1="4" x2="24" y2="12" />
                  <line x1="24" y1="36" x2="24" y2="44" />
                </svg>
              </div>
              <p className="text-[#f5f0e8]/30 text-sm">
                {tab === "all"
                  ? "No timelines yet. Create one to get started."
                  : "Trash is empty."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayTimelines.map((timeline) => (
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
    </div>
  );
}

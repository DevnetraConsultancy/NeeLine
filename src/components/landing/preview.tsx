"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface PreviewEvent {
  id: string;
  label: string;
  title: string;
  layer: string;
  color: string;
  tier: number;
  x: number;
  notes: string;
  span?: { start: number; end: number; label: string };
  zero?: boolean;
}

const EVENTS: PreviewEvent[] = [
  { id: "sumer", label: "3200 BCE", title: "Indus & Sumer Script", layer: "General", color: "#c9a84c", tier: 0, x: 65, notes: "Earliest pictographic cuneiform and Harappan scripts marking the dawn of recorded civilization." },
  { id: "vedic", label: "1500 BCE", title: "Vedic Period", layer: "General", color: "#c9a84c", tier: 0, x: 245, span: { start: 170, end: 320, label: "1500 BCE – 500 BCE" }, notes: "Historical composition of foundational Vedic hymns and early Indian philosophical literature." },
  { id: "mahavira", label: "599 BCE", title: "Bhagwan Mahavira", layer: "Jainism", color: "#38bdf8", tier: 1, x: 295, notes: "24th Tirthankara of Jainism, expounding universal non-violence (Ahimsa) and spiritual liberation." },
  { id: "buddha", label: "563 BCE", title: "Gautama Buddha", layer: "General", color: "#c9a84c", tier: 0, x: 345, notes: "Founder of Buddhism, attaining enlightenment at Bodh Gaya and preaching the Middle Way." },
  { id: "zero", label: "0", title: "0", layer: "Landmark", color: "#ef4444", tier: 0, x: 430, zero: true, notes: "The permanent zero point on the number line, between 1 BCE and 1 CE." },
  { id: "gutenberg", label: "1440 CE", title: "Gutenberg Press", layer: "Renaissance", color: "#10b981", tier: 0, x: 545, notes: "Invention of movable type printing press in Mainz, accelerating the European scientific revolution." },
  { id: "apollo", label: "1969 CE", title: "Apollo 11 Landing", layer: "Modern", color: "#8b5cf6", tier: 1, x: 655, notes: "Humanity's first crewed lunar landing on the Sea of Tranquility, expanding civilization beyond Earth." },
  { id: "ai", label: "2026 CE", title: "Autonomous AI", layer: "Modern", color: "#8b5cf6", tier: 0, x: 740, notes: "The arrival of autonomous agentic software and computational historical modelling." },
];

const SPINE_Y = 140;

/** A static sample timeline; choosing an event shows its details. */
export function LandingPreview() {
  const [selectedId, setSelectedId] = useState("mahavira");
  const selected = EVENTS.find((e) => e.id === selectedId) ?? EVENTS[2];

  return (
    <div className="glass rounded-xl p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-fg">Try the preview</h2>
        <p className="text-sm text-fg-muted">3200 BCE to 2026 CE. Choose an event to see its details.</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-[var(--canvas-bg)]">
        <svg viewBox="0 0 800 200" className="h-auto min-w-[720px] w-full" role="group" aria-label="Sample timeline">
          <line x1={30} x2={770} y1={SPINE_Y} y2={SPINE_Y} stroke="var(--canvas-spine)" strokeWidth={2.5} />
          {EVENTS.map((e) => {
            const active = e.id === selectedId;
            const choose = { role: "button", tabIndex: 0, "aria-pressed": active, "aria-label": `${e.title}, ${e.span?.label ?? e.label}`, onClick: () => setSelectedId(e.id), onKeyDown: (k: React.KeyboardEvent) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), setSelectedId(e.id)), style: { cursor: "pointer", outline: "none" }, className: "[&:focus-visible_.ring]:opacity-100" } as const;
            if (e.span) {
              const y = 24;
              const w = 110;
              return (
                <g key={e.id} {...choose}>
                  <line x1={e.span.start} x2={e.span.start} y1={y} y2={SPINE_Y} stroke={e.color} strokeDasharray="3 3" opacity={0.5} />
                  <line x1={e.span.end} x2={e.span.end} y1={y} y2={SPINE_Y} stroke={e.color} strokeDasharray="3 3" opacity={0.5} />
                  <line x1={e.span.start} x2={e.span.end} y1={y} y2={y} stroke={e.color} strokeWidth={2.5} />
                  <rect className="ring" x={e.x - w / 2 - 4} y={y - 15} width={w + 8} height={30} rx={8} fill="none" stroke="var(--canvas-spine)" strokeWidth={2} opacity={0} />
                  <rect x={e.x - w / 2} y={y - 11} width={w} height={22} rx={6} fill="var(--canvas-bg)" stroke={e.color} strokeWidth={active ? 2.5 : 1.5} />
                  <text x={e.x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--canvas-text)">{e.title}</text>
                </g>
              );
            }
            const w = e.zero ? 36 : e.title.length * 6.6 + 20;
            const top = SPINE_Y - 38 - e.tier * 36;
            return (
              <g key={e.id} {...choose}>
                <line x1={e.x} x2={e.x} y1={SPINE_Y - 7} y2={SPINE_Y + 7} stroke={e.color} strokeWidth={2.5} />
                <line x1={e.x} x2={e.x} y1={SPINE_Y - 7} y2={top + 22} stroke={e.color} strokeWidth={1.5} />
                <text x={e.x} y={SPINE_Y + 24} textAnchor="middle" fontSize={11} fontWeight={600} fill={e.color}>{e.label}</text>
                <rect className="ring" x={e.x - w / 2 - 4} y={top - 4} width={w + 8} height={30} rx={8} fill="none" stroke="var(--canvas-spine)" strokeWidth={2} opacity={0} />
                <rect x={e.x - w / 2} y={top} width={w} height={22} rx={6} fill="var(--canvas-bg)" stroke={e.color} strokeWidth={active || e.zero ? 2.5 : 1.5} />
                <text x={e.x} y={top + 15} textAnchor="middle" fontSize={11} fontWeight={e.zero ? 800 : 600} fill={e.zero ? e.color : "var(--canvas-text)"}>{e.title}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 flex gap-4 rounded-lg border border-line p-4" aria-live="polite">
        <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} aria-hidden />
        <div>
          <p className="text-base font-semibold text-fg">{selected.title}</p>
          <p className={cn("mt-0.5 text-sm font-medium text-accent")}>
            {selected.span?.label ?? selected.label} · Layer: {selected.layer}
          </p>
          <p className="mt-2 text-sm text-fg-muted">{selected.notes}</p>
        </div>
      </div>
    </div>
  );
}

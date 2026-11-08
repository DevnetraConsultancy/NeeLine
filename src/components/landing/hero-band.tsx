"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface BandEvent {
  id: string;
  title: string;
  date: string;
  notes: string;
  /** x on the 1200-wide stage. */
  x: number;
  /** Card row above the spine: 0 is nearest. */
  tier: 0 | 1 | 2;
  color: string;
  span?: { x1: number; x2: number; date: string };
  zero?: boolean;
}

/**
 * The hero is the product: a stretch of NeeLine's own canvas, lit by the
 * strata gradient (violet past, gold origin, amber present). It drifts
 * gently until the reader touches it; choosing an event shows its record.
 */
const EVENTS: BandEvent[] = [
  { id: "cuneiform", title: "Cuneiform script", date: "3200 BCE", x: 96, tier: 0, color: "#a8832a", notes: "Reed styluses press the first written records into Sumerian clay." },
  { id: "pyramid", title: "Great Pyramid", date: "2560 BCE", x: 175, tier: 1, color: "#b08e2e", notes: "Giza's largest pyramid is finished after about twenty years of work." },
  { id: "vedic", title: "Vedic period", date: "1500 – 500 BCE", x: 320, tier: 2, color: "#bd9733", notes: "The hymns of the Vedas are composed and carried forward by memory.", span: { x1: 245, x2: 395, date: "1500 – 500 BCE" } },
  { id: "buddha", title: "Gautama Buddha", date: "563 BCE", x: 435, tier: 0, color: "#c49e34", notes: "A teacher in the Ganges basin sets out the Middle Way." },
  { id: "parthenon", title: "Parthenon rises", date: "447 BCE", x: 530, tier: 1, color: "#cda63a", notes: "Athens begins its marble temple to Athena above the city." },
  { id: "caesar", title: "Caesar assassinated", date: "44 BCE", x: 625, tier: 2, color: "#d4af37", notes: "Rome's dictator falls on the Ides of March; the Republic follows." },
  { id: "zero", title: "0", date: "The origin", x: 690, tier: 0, color: "#ef4444", zero: true, notes: "NeeLine keeps a fixed zero between 1 BCE and 1 CE, so eras never drift." },
  { id: "paper", title: "Paper perfected", date: "105 CE", x: 775, tier: 1, color: "#dcb847", notes: "Cai Lun's pulp process gives the world a cheap writing surface." },
  { id: "gutenberg", title: "Gutenberg press", date: "1440 CE", x: 880, tier: 0, color: "#e3c158", notes: "Movable type in Mainz turns books from treasures into tools." },
  { id: "principia", title: "Newton's Principia", date: "1687 CE", x: 975, tier: 2, color: "#e8c766", notes: "Motion and gravity are written down as three short laws." },
  { id: "apollo", title: "Apollo 11", date: "1969 CE", x: 1070, tier: 1, color: "#eccf74", notes: "Two people stand on the Sea of Tranquility and look back at Earth." },
  { id: "today", title: "You are here", date: "Today", x: 1138, tier: 0, color: "#f0d183", notes: "The right-hand end of the line keeps moving. Add what matters to you." },
];

const SPINE_Y = 214;
const TIER_Y = [168, 128, 88];
const STAGE_WIDTH = 1220;

function cardWidth(title: string): number {
  return Math.round(title.length * 7.2 + 26);
}

export function HeroBand() {
  const [selectedId, setSelectedId] = useState("gutenberg");
  const selected = EVENTS.find((e) => e.id === selectedId) ?? EVENTS[8];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // On narrow screens the band is wider than the page and opens at its left
  // edge, leaving the highlighted event (and the caption below) out of view.
  // Start with that event centred instead.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const svg = svgRef.current;
    if (!scroller || !svg || scroller.scrollWidth <= scroller.clientWidth) return;
    const x = (selected.x / STAGE_WIDTH) * svg.getBoundingClientRect().width;
    scroller.scrollLeft = Math.max(0, x - scroller.clientWidth / 2);
    // Only when the band first appears; later picks must not yank the view around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id: string) => () => setSelectedId(id);
  const pickKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(id);
    }
  };

  return (
    <section aria-label="A sample NeeLine timeline, 3200 BCE to today" className="hero-band">
      <div
        ref={scrollerRef}
        className="overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        style={{ maskImage: "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)" }}
      >
        <svg ref={svgRef} viewBox={`0 0 ${STAGE_WIDTH} 268`} className="mx-auto block h-auto w-full min-w-[1080px] max-w-[1600px]" style={{ fontFamily: "var(--font-sans)" }}>
          <defs>
            <linearGradient id="strata-spine" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="1190" y2="0">
              <stop offset="0" stopColor="var(--strata-past)" />
              <stop offset="0.56" stopColor="var(--strata-origin)" />
              <stop offset="1" stopColor="var(--strata-present)" />
            </linearGradient>
            <radialGradient id="zero-dawn">
              <stop offset="0" stopColor="var(--strata-dawn)" />
              <stop offset="1" stopColor="var(--strata-dawn)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g className="hero-drift">
            {/* Dawn at the origin. */}
            <ellipse cx={690} cy={SPINE_Y} rx={190} ry={120} fill="url(#zero-dawn)" aria-hidden />

            {/* The spine itself, lit by the strata. */}
            <line x1={30} x2={1190} y1={SPINE_Y} y2={SPINE_Y} stroke="url(#strata-spine)" strokeWidth={7} opacity={0.18} />
            <line x1={30} x2={1190} y1={SPINE_Y} y2={SPINE_Y} stroke="url(#strata-spine)" strokeWidth={2.5} />

            {EVENTS.map((e) => {
              const active = e.id === selectedId;
              const w = e.zero ? 34 : cardWidth(e.title);
              const cardY = TIER_Y[e.tier];
              const interactive = {
                role: "button" as const,
                tabIndex: 0,
                "aria-pressed": active,
                onClick: pick(e.id),
                onKeyDown: pickKey(e.id),
                style: { cursor: "pointer", outline: "none" },
                className: "[&:focus-visible>.ring]:opacity-100",
              };
              return (
                <g key={e.id} {...interactive}>
                  {e.span && (
                    <>
                      <line x1={e.span.x1} x2={e.span.x2} y1={cardY + 26} y2={cardY + 26} stroke={e.color} strokeWidth={2.2} opacity={0.9} />
                      <line x1={e.span.x1} x2={e.span.x1} y1={cardY + 26} y2={cardY + 36} stroke={e.color} strokeWidth={2.2} strokeLinecap="round" />
                      <line x1={e.span.x2} x2={e.span.x2} y1={cardY + 26} y2={cardY + 36} stroke={e.color} strokeWidth={2.2} strokeLinecap="round" />
                      <line x1={e.span.x1} x2={e.span.x1} y1={cardY + 36} y2={SPINE_Y} stroke={e.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                      <line x1={e.span.x2} x2={e.span.x2} y1={cardY + 36} y2={SPINE_Y} stroke={e.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                    </>
                  )}
                  {!e.span && (
                    <line x1={e.x} x2={e.x} y1={cardY + (e.zero ? 11 : 22)} y2={SPINE_Y} stroke={e.color} strokeWidth={e.zero ? 2 : 1.2} strokeDasharray={e.zero ? undefined : "3 3"} opacity={e.zero ? 0.9 : 0.5} />
                  )}
                  <line x1={e.x} x2={e.x} y1={SPINE_Y - 7} y2={SPINE_Y + 7} stroke={e.color} strokeWidth={2.4} />
                  <circle cx={e.x} cy={SPINE_Y} r={e.zero ? 4.5 : 3.4} fill={e.color} style={{ stroke: "var(--bg)" }} strokeWidth={1.5} />

                  <rect className="ring" x={e.x - w / 2 - 4} y={cardY - 15} width={w + 8} height={30} rx={9} fill="none" style={{ stroke: "var(--fg)" }} strokeWidth={1.5} opacity={0} />
                  <rect
                    x={e.x - w / 2}
                    y={cardY - 11}
                    width={w}
                    height={22}
                    rx={6.5}
                    style={{ fill: active ? "var(--surface-solid)" : "var(--bg)" }}
                    stroke={e.color}
                    strokeWidth={active || e.zero ? 2.4 : 1.4}
                  />
                  <text x={e.x} y={cardY + 4} textAnchor="middle" fontSize={e.zero ? 12.5 : 12} fontWeight={e.zero ? 800 : 600} style={{ fill: e.zero ? e.color : "var(--fg)" }}>
                    {e.title}
                  </text>
                  <text x={e.x} y={SPINE_Y + 24} textAnchor="middle" fontSize={10.5} fontWeight={600} style={{ fill: active ? "var(--fg)" : "var(--fg-subtle)" }}>
                    {e.span ? e.span.date : e.zero ? "" : e.date}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mx-auto flex min-h-16 max-w-2xl items-start justify-center gap-3 px-4 text-center" aria-live="polite">
        <p className="text-sm text-fg-muted">
          <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: selected.color }} aria-hidden />
          <span className="font-semibold text-fg">{selected.title}</span>
          <span className="text-fg-subtle"> — {selected.date}. </span>
          {selected.notes}
        </p>
      </div>
    </section>
  );
}

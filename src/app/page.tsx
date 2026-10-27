"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { loginWithGoogle } from "@/app/actions/auth";
import {
  Sparkles,
  Layers,
  ZoomIn,
  Download,
  ArrowRight,
  User,
  Clock,
  ChevronRight,
  Film,
  Landmark,
} from "lucide-react";

interface CanvasPreviewEvent {
  id: string;
  year: number;
  isBce: boolean;
  yearLabel: string;
  title: string;
  layer: string;
  color: string;
  tier: number;
  x: number; // SVG X coordinate along 800px width
  isSpan?: boolean;
  startX?: number;
  endX?: number;
  endYearLabel?: string;
  notes: string;
}

const CANVAS_PREVIEW_EVENTS: CanvasPreviewEvent[] = [
  {
    id: "ev-1",
    year: 3200,
    isBce: true,
    yearLabel: "3200 BCE",
    title: "Indus & Sumer Script",
    layer: "General",
    color: "#d4786c",
    tier: 0,
    x: 65,
    notes: "Earliest pictographic cuneiform and Harappan scripts marking the dawn of recorded civilization.",
  },
  {
    id: "ev-2",
    year: 1500,
    isBce: true,
    yearLabel: "1500 BCE",
    endYearLabel: "500 BCE",
    title: "Vedic Period",
    layer: "General",
    color: "#e8a87c",
    tier: 0,
    isSpan: true,
    startX: 170,
    endX: 320,
    x: 245,
    notes: "Historical composition of foundational Vedic hymns and early Indian philosophical literature.",
  },
  {
    id: "ev-3",
    year: 599,
    isBce: true,
    yearLabel: "599 BCE",
    title: "Bhagwan Mahavira",
    layer: "Jainism",
    color: "#38bdf8",
    tier: 1,
    x: 295,
    notes: "24th Tirthankara of Jainism, expounding universal non-violence (Ahimsa) and spiritual liberation.",
  },
  {
    id: "ev-4",
    year: 563,
    isBce: true,
    yearLabel: "563 BCE",
    title: "Gautama Buddha",
    layer: "General",
    color: "#c9a84c",
    tier: 0,
    x: 345,
    notes: "Founder of Buddhism, attaining enlightenment at Bodh Gaya and preaching the Middle Way.",
  },
  {
    id: "ev-0",
    year: 0,
    isBce: false,
    yearLabel: "0",
    title: "0 CE",
    layer: "Landmark",
    color: "#ef4444",
    tier: 0,
    x: 430,
    notes: "Permanent Zero Reference Point on the Golden Number Line, bridging BCE and CE epochs.",
  },
  {
    id: "ev-5",
    year: 1440,
    isBce: false,
    yearLabel: "1440 CE",
    title: "Gutenberg Press",
    layer: "Renaissance",
    color: "#10b981",
    tier: 0,
    x: 545,
    notes: "Invention of movable type printing press in Mainz, accelerating the European scientific revolution.",
  },
  {
    id: "ev-6",
    year: 1969,
    isBce: false,
    yearLabel: "1969 CE",
    title: "Apollo 11 Landing",
    layer: "Modern",
    color: "#3b82f6",
    tier: 1,
    x: 655,
    notes: "Humanity's first crewed lunar landing on the Sea of Tranquility, expanding civilization beyond Earth.",
  },
  {
    id: "ev-7",
    year: 2026,
    isBce: false,
    yearLabel: "2026 CE",
    title: "Autonomous AI",
    layer: "Modern",
    color: "#8b5cf6",
    tier: 0,
    x: 740,
    notes: "The dawn of autonomous agentic software and computational historical modeling on NeeLine.",
  },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("ev-3"); // Default to Bhagwan Mahavira
  const [hasVideoSource, setHasVideoSource] = useState(false);

  // Check for promotional video presence from environment or static public file
  useEffect(() => {
    const customUrl = process.env.NEXT_PUBLIC_PROMO_VIDEO_URL;
    if (customUrl) {
      setHasVideoSource(true);
      return;
    }

    fetch("/videos/promo.mp4", { method: "HEAD" })
      .then((res) => {
        if (res.ok && res.headers.get("content-type")?.includes("video")) {
          setHasVideoSource(true);
        } else {
          setHasVideoSource(false);
        }
      })
      .catch(() => {
        setHasVideoSource(false);
      });
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  async function handleGuestLogin() {
    setGuestLoading(true);
    try {
      const result = await signIn("credentials", { guest: "true", redirect: false });
      if (result?.error) {
        throw new Error(result.error);
      }
      router.push("/dashboard");
    } catch {
      setGuestLoading(false);
      alert("Guest sign-in is unavailable. Check the database configuration.");
    }
  }

  const selectedEvent =
    CANVAS_PREVIEW_EVENTS.find((e) => e.id === selectedEventId) || CANVAS_PREVIEW_EVENTS[2];

  return (
    <div className="relative min-h-screen theme-bg flex flex-col overflow-x-hidden selection:bg-[#c9a84c]/30">
      {/* Global Synchronized Navbar */}
      <Navbar />

      {/* Ambient background glows */}
      <div className="ambient-glow w-[680px] h-[680px] bg-[#c9a84c] top-[-100px] left-1/2 -translate-x-1/2 opacity-15" />
      <div className="ambient-glow w-[550px] h-[550px] bg-[#2a4d80] top-[300px] -left-[100px] opacity-15" />
      <div className="ambient-glow w-[480px] h-[480px] bg-[#8a4baf] bottom-[250px] -right-[50px] opacity-15" />

      {/* Large Translucent Archival Grid Pattern (Light Parchment / Dark Obsidian) */}
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      {/* Main hero section (tight padding top so title is immediately visible under navbar) */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-16 sm:pt-20 pb-16 flex flex-col items-center flex-1 w-full">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/35 text-[#c9a84c] text-xs font-mono mb-5 backdrop-blur-md shadow-[0_0_24px_rgba(201,168,76,0.18)] font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Next Generation Historical Canvas</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>

        {/* Hero Title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold text-center tracking-tight max-w-4xl leading-[1.08] mb-4 theme-card-title"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Visualize History on a{" "}
          <span className="bg-gradient-to-r from-[#dfbc5e] via-[#c9a84c] to-[#926907] bg-clip-text text-transparent">
            Number Line.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl theme-text-muted text-center max-w-2xl leading-relaxed mb-8 font-light"
          style={{ fontFamily: "var(--font-body)" }}
        >
          An algorithmic, horizontal time canvas designed for scholars, researchers, and curious minds. Map deep time from ancient antiquity to the modern era with mathematical precision.
        </p>

        {/* ========================================================
            LARGE PROMOTIONAL VIDEO VIEWPORT (Under Hero Title)
            ======================================================== */}
        <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden liquid-glass p-2 sm:p-2.5 mb-10 shadow-2xl relative">
          {hasVideoSource ? (
            <video
              src={process.env.NEXT_PUBLIC_PROMO_VIDEO_URL || "/videos/promo.mp4"}
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-[16/9] sm:aspect-[21/9] object-cover rounded-xl sm:rounded-2xl bg-black"
            />
          ) : (
            /* Clean, elegant placeholder frame ready for /public/videos/promo.mp4 */
            <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#0a1122] via-[#070c16] to-[#0d182e] border border-black/10 dark:border-white/[0.08] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden select-none">
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(201, 168, 76, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(201, 168, 76, 0.15) 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                }}
              />
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] mb-3 shadow-[0_0_24px_rgba(201,168,76,0.3)] z-10">
                <Film className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h4
                className="text-base sm:text-lg font-bold text-white mb-1 z-10"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Promotional Video Viewport
              </h4>
              <p className="text-xs text-slate-400 font-mono max-w-md z-10">
                Place your video in{" "}
                <code className="text-[#c9a84c] bg-[#c9a84c]/15 px-1.5 py-0.5 rounded font-semibold">
                  /public/videos/promo.mp4
                </code>{" "}
                or set <code className="text-[#c9a84c] bg-[#c9a84c]/15 px-1.5 py-0.5 rounded font-semibold">NEXT_PUBLIC_PROMO_VIDEO_URL</code>
              </p>
            </div>
          )}
        </div>

        {/* Auth CTA Card - Liquid Glass */}
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl liquid-glass relative mb-16 shadow-2xl">
          {status === "loading" ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
              <span className="text-xs text-[#c9a84c] font-mono">Authenticating session...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-[#c9a84c] font-semibold">
                  Access Your Workspace
                </span>
                <p className="text-sm theme-text-muted mt-1 font-light">
                  Start mapping your historical chronology in seconds.
                </p>
              </div>

              {/* Google Sign In using Server Action */}
              <form action={loginWithGoogle} className="w-full">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-white text-[#0a1628] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#fafaf9] border border-black/10 transition-all shadow-[0_4px_18px_rgba(0,0,0,0.08)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
                <span className="text-[11px] font-mono theme-text-subtle uppercase">
                  or instant sandbox
                </span>
                <div className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
              </div>

              {/* Guest Login */}
              <button
                onClick={handleGuestLogin}
                disabled={guestLoading}
                className="w-full h-11 rounded-xl btn-ghost-gold font-medium text-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <User className="w-4 h-4 text-[#c9a84c]" />
                <span>{guestLoading ? "Opening Guest Sandbox..." : "Continue as Guest"}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </button>

              <p className="text-[11px] theme-text-subtle text-center mt-1 font-mono">
                No credit card or registration required · Private instant session
              </p>
            </div>
          )}
        </div>

        {/* ========================================================
            INTERACTIVE DEEP-TIME PREVIEW (100% Canvas Event Logic)
            ======================================================== */}
        <section className="w-full max-w-5xl rounded-3xl liquid-glass p-6 sm:p-8 mb-20 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#c9a84c] shadow-[0_0_10px_#c9a84c]" />
                <h3
                  className="text-lg font-bold theme-card-title"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Interactive Deep-Time Preview
                </h3>
              </div>
              <p className="text-xs theme-text-muted mt-1">
                Click any milestone card to inspect chronological coordinates, layer bindings, and notes.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-3 py-1.5 rounded-xl border border-[#c9a84c]/30 self-start sm:self-auto font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Span: 5,226 Years Illustrated</span>
            </div>
          </div>

          {/* Genuine SVG Timeline Canvas (Identical to TimelineRenderer.tsx) */}
          <div className="relative py-6 px-2 sm:px-6 preview-track rounded-2xl overflow-x-auto shadow-inner select-none">
            <svg
              viewBox="0 0 800 210"
              className="w-full min-w-[760px] h-[210px] overflow-visible"
            >
              {/* Golden Spine Line */}
              <line
                x1="30"
                y1="140"
                x2="770"
                y2="140"
                stroke="#c9a84c"
                strokeWidth="2.5"
                opacity="0.9"
              />

              {/* Bracket Span: Vedic Period (1500 BCE - 500 BCE) */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedEventId("ev-2")}
              >
                {/* Projection drop lines down to spine */}
                <line
                  x1="170"
                  y1="34"
                  x2="170"
                  y2="140"
                  stroke="#e8a87c"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />
                <line
                  x1="320"
                  y1="34"
                  x2="320"
                  y2="140"
                  stroke="#e8a87c"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />

                {/* Horizontal Top Bracket Crossbar */}
                <line
                  x1="170"
                  y1="24"
                  x2="320"
                  y2="24"
                  stroke="#e8a87c"
                  strokeWidth="2.5"
                  opacity="0.95"
                />
                {/* Left Cap */}
                <line
                  x1="170"
                  y1="24"
                  x2="170"
                  y2="34"
                  stroke="#e8a87c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Right Cap */}
                <line
                  x1="320"
                  y1="24"
                  x2="320"
                  y2="34"
                  stroke="#e8a87c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Center Label Card */}
                <rect
                  x="195"
                  y="12"
                  width="100"
                  height="24"
                  rx="6"
                  className={selectedEventId === "ev-2" ? "fill-amber-500/20" : "fill-[#070c16]"}
                  stroke="#e8a87c"
                  strokeWidth={selectedEventId === "ev-2" ? "2.5" : "1.8"}
                  style={{
                    filter: selectedEventId === "ev-2" ? "drop-shadow(0 0 8px #e8a87c)" : "none",
                  }}
                />
                <text
                  x="245"
                  y="28"
                  textAnchor="middle"
                  fill="#f5f0e8"
                  fontSize="11"
                  fontFamily="var(--font-display)"
                  fontWeight="600"
                >
                  Vedic Period
                </text>
              </g>

              {/* Point Milestone Events */}
              {CANVAS_PREVIEW_EVENTS.filter((e) => !e.isSpan).map((ev) => {
                const isSelected = selectedEventId === ev.id;
                const isZero = ev.year === 0;

                // Stacking tiers: tier 0 is near spine, tier 1 sits higher
                const tierSpacing = 36;
                const cardY = 140 - 24 - 14 - ev.tier * tierSpacing;
                const cardWidth = isZero ? 56 : ev.title.length * 7.5 + 24;

                return (
                  <g
                    key={ev.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedEventId(ev.id)}
                  >
                    {/* Tick Mark on Golden Spine */}
                    <line
                      x1={ev.x}
                      y1={134}
                      x2={ev.x}
                      y2={146}
                      stroke={isZero ? "#ef4444" : "#c9a84c"}
                      strokeWidth={isZero ? "3" : "1.5"}
                    />

                    {/* Date label directly below spine tick on axis */}
                    <text
                      x={ev.x}
                      y={164}
                      textAnchor="middle"
                      fill={isZero ? "#ef4444" : "#c9a84c"}
                      fontSize={isZero ? "11" : "10"}
                      fontFamily="var(--font-mono)"
                      fontWeight={isZero ? "800" : "600"}
                      opacity={isSelected || isZero ? "1" : "0.75"}
                    >
                      {ev.yearLabel}
                    </text>

                    {/* Vertical connector stem rising from spine tick up to card */}
                    <line
                      x1={ev.x}
                      y1={134}
                      x2={ev.x}
                      y2={cardY + 24}
                      stroke={isZero ? "#ef4444" : ev.color}
                      strokeWidth={isZero ? "2.5" : "1.5"}
                      opacity={isSelected ? "1" : "0.85"}
                    />

                    {/* Event Milestone Card */}
                    <rect
                      x={ev.x - cardWidth / 2}
                      y={cardY}
                      width={cardWidth}
                      height="24"
                      rx="6"
                      className={
                        isZero
                          ? "fill-[#070c16]"
                          : isSelected
                          ? "fill-white/10"
                          : "fill-[#070c16]"
                      }
                      stroke={isZero ? "#ef4444" : ev.color}
                      strokeWidth={isZero ? "3" : isSelected ? "2.5" : "1.8"}
                      style={{
                        filter:
                          isSelected || isZero
                            ? `drop-shadow(0 0 10px ${isZero ? "#ef4444" : ev.color})`
                            : "none",
                      }}
                    />

                    {/* Event Title Text inside card */}
                    <text
                      x={ev.x}
                      y={cardY + 16}
                      textAnchor="middle"
                      fill={isZero ? "#ef4444" : "#f5f0e8"}
                      fontSize={isZero ? "11.5" : "11"}
                      fontFamily="var(--font-display)"
                      fontWeight={isZero ? "800" : "600"}
                      letterSpacing="0.01em"
                    >
                      {ev.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active Event Detail Spotlight (Matching Canvas Event Attributes) */}
          <div className="mt-6 p-4 rounded-2xl preview-spotlight flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="w-3.5 h-12 rounded-full shadow-sm shrink-0"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold theme-card-title">
                    {selectedEvent.title}
                  </span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                    style={{
                      borderColor: `${selectedEvent.color}55`,
                      backgroundColor: `${selectedEvent.color}18`,
                      color: selectedEvent.color,
                    }}
                  >
                    Layer: {selectedEvent.layer}
                  </span>
                  <span className="text-[10px] font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-2 py-0.5 rounded border border-[#c9a84c]/30 font-semibold">
                    {selectedEvent.yearLabel}
                    {selectedEvent.endYearLabel ? ` – ${selectedEvent.endYearLabel}` : ""}
                  </span>
                </div>
                <p className="text-xs theme-text-muted mt-1 leading-relaxed max-w-xl">
                  {selectedEvent.notes}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-2.5 py-1 rounded-lg border border-[#c9a84c]/30 font-semibold shadow-xs self-start sm:self-auto shrink-0">
              Active Focus
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-16">
          <div className="p-6 rounded-3xl theme-card border border-black/10 dark:border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center mb-4 border border-[#c9a84c]/30 shadow-sm">
              <ZoomIn className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 theme-card-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Infinite Deep-Time Zoom
            </h4>
            <p className="text-sm theme-text-muted leading-relaxed font-light">
              Glide from geological epochs spanning millions of years down to exact calendar days with continuous fluid mousewheel and pinch zoom.
            </p>
          </div>

          <div className="p-6 rounded-3xl theme-card border border-black/10 dark:border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-[#5a9bd5]/15 text-[#5a9bd5] flex items-center justify-center mb-4 border border-[#5a9bd5]/30 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 theme-card-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Multi-Tier Layout Engine
            </h4>
            <p className="text-sm theme-text-muted leading-relaxed font-light">
              Events automatically stack across non-overlapping tiers. When events pack tightly, they collapse into interactive glowing nodes.
            </p>
          </div>

          <div className="p-6 rounded-3xl theme-card border border-black/10 dark:border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-[#7ab8a0]/15 text-[#7ab8a0] flex items-center justify-center mb-4 border border-[#7ab8a0]/30 shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 theme-card-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Publication-Grade Export
            </h4>
            <p className="text-sm theme-text-muted leading-relaxed font-light">
              Export ultra-crisp 2x retina PNG graphics for academic presentations, papers, and essays, or download clean tabular TXT and JSON data.
            </p>
          </div>
        </div>

        {/* ========================================================
            CLOSING CTA BANNER (FIXED: Liquid Glass in Light & Dark)
            ======================================================== */}
        <div className="w-full max-w-5xl p-8 sm:p-12 rounded-3xl liquid-glass relative text-center mb-16 overflow-hidden shadow-2xl border border-black/10 dark:border-[#c9a84c]/25">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/35 text-[#c9a84c] text-xs font-mono font-medium">
              <Landmark className="w-3.5 h-3.5" />
              <span>Academic & Scholarly Research</span>
            </div>
            <h3
              className="text-2xl sm:text-3xl font-bold tracking-tight theme-card-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Plot Your Historical Horizons?
            </h3>
            <p className="text-sm theme-text-muted font-light leading-relaxed">
              Join scholars and researchers mapping world civilizations on an algorithmic, mathematically stable number line.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                onClick={handleGuestLogin}
                className="btn-gold px-6 py-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Launch Instant Sandbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Locked Unified Premium Footer */}
      <Footer />
    </div>
  );
}

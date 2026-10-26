"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
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
} from "lucide-react";

const SAMPLE_EVENTS = [
  { year: "3200 BCE", title: "Cuneiform Script", era: "Sumer", color: "#d4786c" },
  { year: "2560 BCE", title: "Great Pyramid of Giza", era: "Old Kingdom", color: "#e8a87c" },
  { year: "776 BCE", title: "First Olympic Games", era: "Ancient Greece", color: "#c9a84c" },
  { year: "44 BCE", title: "Ides of March", era: "Roman Republic", color: "#eab308" },
  { year: "1440 CE", title: "Gutenberg Printing Press", era: "Renaissance", color: "#10b981" },
  { year: "1969 CE", title: "Apollo 11 Lunar Landing", era: "Space Age", color: "#3b82f6" },
  { year: "2026 CE", title: "Autonomous AI Frontier", era: "Modern Era", color: "#8b5cf6" },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);
  const [activeSampleIndex, setActiveSampleIndex] = useState(4); // Default to Gutenberg Printing Press
  const [buildTime, setBuildTime] = useState<string>("");

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_BUILD_TIME;
    if (raw) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          setBuildTime(
            d.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })
          );
        }
      } catch {
        // fallback
      }
    }
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

  return (
    <div className="relative min-h-screen theme-bg flex flex-col overflow-x-hidden selection:bg-[#c9a84c]/30">
      {/* Global Synchronized Navbar */}
      <Navbar />

      {/* Ambient background glows */}
      <div className="ambient-glow w-[600px] h-[600px] bg-[#c9a84c] top-[-100px] left-1/2 -translate-x-1/2 opacity-15" />
      <div className="ambient-glow w-[500px] h-[500px] bg-[#2a4d80] top-[350px] -left-[100px] opacity-15" />
      <div className="ambient-glow w-[450px] h-[450px] bg-[#8a4baf] bottom-[100px] -right-[50px] opacity-15" />

      {/* Subtle coordinate grid lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #c9a84c 1px, transparent 1px), linear-gradient(to bottom, #c9a84c 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Main hero section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center flex-1">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-mono mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(201,168,76,0.15)] font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Next Generation Historical Canvas</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>

        {/* Hero Title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold text-center tracking-tight max-w-4xl leading-[1.08] mb-6 theme-card-title"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Visualize History on a{" "}
          <span className="bg-gradient-to-r from-[#dfbc5e] via-[#c9a84c] to-[#926907] bg-clip-text text-transparent">
            Number Line.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl theme-text-muted text-center max-w-2xl leading-relaxed mb-10 font-light"
          style={{ fontFamily: "var(--font-body)" }}
        >
          An algorithmic, horizontal time canvas designed for scholars, researchers, and curious minds. Map deep time from ancient antiquity to the modern era with mathematical precision.
        </p>

        {/* Auth CTA Card */}
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl glass-panel relative mb-16 border border-black/10 dark:border-[#c9a84c]/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
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

              {/* Google Sign In using Server Action for reliable direct redirect */}
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

        {/* Interactive Sample Timeline Showcase */}
        <section className="w-full max-w-5xl rounded-2xl glass-panel p-6 sm:p-8 mb-20 border border-black/10 dark:border-[#c9a84c]/20 relative overflow-hidden shadow-xl">
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
                Click any milestone below to simulate real-time temporal focusing.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-3 py-1.5 rounded-lg border border-[#c9a84c]/30 self-start sm:self-auto font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Span: 5,226 Years Illustrated</span>
            </div>
          </div>

          {/* Simulated Number Line Spine */}
          <div className="relative py-12 px-4 sm:px-8 preview-track rounded-xl overflow-x-auto shadow-inner">
            {/* The Golden Spine */}
            <div className="relative w-full min-w-[700px] h-20 flex items-center">
              <div className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#c9a84c]/20 via-[#c9a84c] to-[#c9a84c]/20 shadow-[0_0_8px_rgba(201,168,76,0.3)]" />

              {/* Zero Marker */}
              <div className="absolute left-[54%] -translate-x-1/2 flex flex-col items-center">
                <div className="w-[2px] h-8 preview-zero-line mb-1" />
                <div className="w-3.5 h-3.5 rounded-full preview-zero-circle flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
                </div>
                <span className="text-[10px] font-mono preview-zero-text mt-1 font-semibold">0 CE</span>
              </div>

              {/* Milestones along the number line */}
              <div className="relative w-full flex justify-between items-center z-10 px-4">
                {SAMPLE_EVENTS.map((event, idx) => {
                  const isActive = activeSampleIndex === idx;
                  return (
                    <button
                      key={event.title}
                      onClick={() => setActiveSampleIndex(idx)}
                      className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105"
                    >
                      {/* Top Label Card */}
                      <div
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold mb-3 transition-all whitespace-nowrap ${
                          isActive
                            ? "preview-pill-active scale-105"
                            : "preview-pill-inactive hover:scale-102"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {event.title}
                      </div>

                      {/* Tick & Point */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          isActive
                            ? "scale-125 ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-white dark:ring-offset-[#070c16] shadow-md"
                            : "group-hover:scale-110"
                        }`}
                        style={{
                          backgroundColor: event.color,
                          borderColor: isActive ? "#ffffff" : "rgba(0,0,0,0.4)",
                          boxShadow: isActive ? `0 0 16px ${event.color}` : "none",
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Bottom Year & Era */}
                      <div className="mt-3 text-center">
                        <div
                          className="text-[11px] font-mono font-bold"
                          style={{ color: event.color }}
                        >
                          {event.year}
                        </div>
                        <div className="text-[9px] theme-text-subtle font-mono tracking-tight font-medium">
                          {event.era}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Event Detail Spotlight */}
          <div className="mt-6 p-4 rounded-xl preview-spotlight flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-10 rounded-full shadow-sm"
                style={{ backgroundColor: SAMPLE_EVENTS[activeSampleIndex].color }}
              />
              <div>
                <div className="text-sm font-semibold theme-card-title">
                  {SAMPLE_EVENTS[activeSampleIndex].title}
                </div>
                <div className="text-xs theme-text-muted font-mono mt-0.5">
                  Era: {SAMPLE_EVENTS[activeSampleIndex].era} · Chronological Coordinate:{" "}
                  <span className="font-semibold text-[#c9a84c]">{SAMPLE_EVENTS[activeSampleIndex].year}</span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-2.5 py-1 rounded border border-[#c9a84c]/30 font-semibold shadow-xs">
              Active Focus
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-12">
          <div className="p-6 rounded-2xl theme-card border border-black/10 dark:border-white/[0.08]">
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

          <div className="p-6 rounded-2xl theme-card border border-black/10 dark:border-white/[0.08]">
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

          <div className="p-6 rounded-2xl theme-card border border-black/10 dark:border-white/[0.08]">
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
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 theme-footer">
        <div className="max-w-6xl mx-auto space-y-4 text-xs font-mono theme-text-muted">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()} NeeLine</span>
              <span>·</span>
              <span className="font-medium">Developed in Collaboration with Academia | Devnetra Consultancy</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="mailto:devnetraconsultancy@gmail.com"
                className="hover:text-[#c9a84c] transition-colors"
              >
                Support
              </a>
              <a
                href="https://www.instagram.com/scien_nee/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#c9a84c] transition-colors"
              >
                @scien_nee
              </a>
              <span className="text-[10px] px-2 py-0.5 rounded theme-pill border border-[#c9a84c]/20 text-[#c9a84c] font-semibold">
                Number Line Engine
              </span>
            </div>
          </div>

          {/* Dedicated Production Build Status & Last Update */}
          <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-[11px] opacity-80">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
              <span>Production Release</span>
              <span>·</span>
              <span>
                Last build update:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {buildTime || "Latest Build"}
                </span>
              </span>
            </span>
            <span className="text-[10px] tracking-wide text-slate-500 dark:text-slate-400">
              v0.1.0 • Academic Edition
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

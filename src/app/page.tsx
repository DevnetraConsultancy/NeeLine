"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Layers,
  ZoomIn,
  Download,
  ArrowRight,
  User,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const SAMPLE_EVENTS = [
  { year: "3200 BCE", title: "Cuneiform Script", era: "Sumer", color: "#d4786c" },
  { year: "2560 BCE", title: "Great Pyramid of Giza", era: "Old Kingdom", color: "#e8a87c" },
  { year: "776 BCE", title: "First Olympic Games", era: "Ancient Greece", color: "#e8d5a3" },
  { year: "44 BCE", title: "Ides of March", era: "Roman Republic", color: "#c9a84c" },
  { year: "1440 CE", title: "Gutenberg Printing Press", era: "Renaissance", color: "#7ab8a0" },
  { year: "1969 CE", title: "Apollo 11 Lunar Landing", era: "Space Age", color: "#5a9bd5" },
  { year: "2026 CE", title: "Autonomous AI Frontier", era: "Modern Era", color: "#b07cc6" },
];

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);
  const [activeSampleIndex, setActiveSampleIndex] = useState(3);

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
    <div className="relative min-h-screen bg-[#070c16] text-[#f5f0e8] overflow-x-hidden selection:bg-[#c9a84c]/30 selection:text-[#f5f0e8]">
      {/* Ambient background glows */}
      <div className="ambient-glow w-[600px] h-[600px] bg-[#c9a84c] top-[-100px] left-1/2 -translate-x-1/2 opacity-15" />
      <div className="ambient-glow w-[500px] h-[500px] bg-[#2a4d80] top-[350px] -left-[100px] opacity-10" />
      <div className="ambient-glow w-[450px] h-[450px] bg-[#8a4baf] bottom-[100px] -right-[50px] opacity-10" />

      {/* Subtle coordinate grid lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #c9a84c 1px, transparent 1px), linear-gradient(to bottom, #c9a84c 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Top micro bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#c9a84c] via-[#ecd58e] to-[#a4812d] flex items-center justify-center p-[1px] shadow-[0_0_15px_rgba(201,168,76,0.25)]">
            <div className="w-full h-full rounded-full bg-[#070c16] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-[#c9a84c]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
          </div>
          <span
            className="text-xl font-bold tracking-tight text-[#f5f0e8]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nee<span className="text-[#c9a84c]">Line</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#f5f0e8]/50 font-mono">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v0.1 · Deep-Time Number Line
          </span>
          <a
            href="https://github.com/DevnetraConsultancy/NeeLine"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#f5f0e8]/60 hover:text-[#c9a84c] transition-colors"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main hero section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24 flex flex-col items-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/25 text-[#c9a84c] text-xs font-mono mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(201,168,76,0.12)]">
          <Sparkles className="w-3.5 h-3.5 text-[#ecd58e]" />
          <span>The Next Generation Historical Canvas</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>

        {/* Hero Title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold text-center tracking-tight max-w-4xl leading-[1.08] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Visualize History on a{" "}
          <span className="bg-gradient-to-r from-[#f5f0e8] via-[#e8d5a3] to-[#c9a84c] bg-clip-text text-transparent">
            Number Line.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl text-[#f5f0e8]/60 text-center max-w-2xl leading-relaxed mb-10 font-light"
          style={{ fontFamily: "var(--font-body)" }}
        >
          An algorithmic, horizontal time canvas designed for scholars, researchers, and curious minds. Map deep time from ancient antiquity to the modern era with mathematical precision.
        </p>

        {/* Auth CTA Card */}
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl glass-card relative mb-16 border border-[#c9a84c]/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          {status === "loading" ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
              <span className="text-xs text-[#c9a84c]/70 font-mono">Authenticating session...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-[#c9a84c]/80">
                  Access Your Workspace
                </span>
                <p className="text-sm text-[#f5f0e8]/60 mt-1">
                  Start mapping your historical chronology in seconds.
                </p>
              </div>

              {/* Google Sign In */}
              <button
                onClick={() => signIn("google")}
                className="w-full h-12 rounded-xl bg-white text-[#0a1628] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#f5f0e8] transition-all shadow-[0_4px_18px_rgba(255,255,255,0.12)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-[11px] font-mono text-[#f5f0e8]/30 uppercase">
                  or instant sandbox
                </span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Guest Login */}
              <button
                onClick={handleGuestLogin}
                disabled={guestLoading}
                className="w-full h-11 rounded-xl btn-ghost-gold font-medium text-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <User className="w-4 h-4 text-[#c9a84c]" />
                <span>{guestLoading ? "Opening Guest Sandbox..." : "Continue as Guest"}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <p className="text-[11px] text-[#f5f0e8]/35 text-center mt-1 font-mono">
                No credit card or registration required · Private instant session
              </p>
            </div>
          )}
        </div>

        {/* Interactive Sample Timeline Showcase */}
        <section className="w-full max-w-5xl rounded-2xl glass-card p-6 sm:p-8 mb-20 border border-[#c9a84c]/20 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#c9a84c] shadow-[0_0_8px_#c9a84c]" />
                <h3
                  className="text-lg font-bold text-[#f5f0e8]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Interactive Deep-Time Preview
                </h3>
              </div>
              <p className="text-xs text-[#f5f0e8]/50 mt-1">
                Click any milestone below to simulate real-time temporal focusing.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c]/80 bg-[#c9a84c]/10 px-3 py-1.5 rounded-lg border border-[#c9a84c]/20 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>Span: 5,226 Years Illustrated</span>
            </div>
          </div>

          {/* Simulated Number Line Spine */}
          <div className="relative py-12 px-4 sm:px-8 bg-[#091122]/60 rounded-xl border border-white/[0.05] overflow-x-auto">
            {/* The Golden Spine */}
            <div className="relative w-full min-w-[700px] h-20 flex items-center">
              <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-[#c9a84c]/20 via-[#c9a84c] to-[#c9a84c]/20" />

              {/* Zero Marker */}
              <div className="absolute left-[54%] -translate-x-1/2 flex flex-col items-center">
                <div className="w-[2px] h-8 bg-white/40 mb-1" />
                <div className="w-3 h-3 rounded-full border border-white/60 bg-[#070c16] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
                <span className="text-[10px] font-mono text-white/50 mt-1">0 CE</span>
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
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium mb-3 transition-all whitespace-nowrap shadow-md ${
                          isActive
                            ? "bg-[#0d1629] text-[#f5f0e8] border border-amber-400/60 scale-105 shadow-[0_0_12px_rgba(201,168,76,0.3)]"
                            : "bg-[#0a1220]/80 text-[#f5f0e8]/70 border border-white/[0.08] hover:border-white/30"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {event.title}
                      </div>

                      {/* Tick & Point */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center ${
                          isActive ? "scale-125" : "group-hover:scale-110"
                        }`}
                        style={{
                          backgroundColor: event.color,
                          borderColor: isActive ? "#ffffff" : "#070c16",
                          boxShadow: isActive ? `0 0 12px ${event.color}` : "none",
                        }}
                      >
                        <div className="w-1 h-1 rounded-full bg-white" />
                      </div>

                      {/* Bottom Year & Era */}
                      <div className="mt-3 text-center">
                        <div
                          className="text-[11px] font-mono font-semibold"
                          style={{ color: event.color }}
                        >
                          {event.year}
                        </div>
                        <div className="text-[9px] text-[#f5f0e8]/40 font-mono tracking-tight">
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
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-10 rounded-full"
                style={{ backgroundColor: SAMPLE_EVENTS[activeSampleIndex].color }}
              />
              <div>
                <div className="text-sm font-semibold text-[#f5f0e8]">
                  {SAMPLE_EVENTS[activeSampleIndex].title}
                </div>
                <div className="text-xs text-[#f5f0e8]/50 font-mono">
                  Era: {SAMPLE_EVENTS[activeSampleIndex].era} · Chronological Coordinate:{" "}
                  {SAMPLE_EVENTS[activeSampleIndex].year}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#c9a84c]/80 bg-[#c9a84c]/10 px-2.5 py-1 rounded">
              Active Focus
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-24">
          <div className="p-6 rounded-2xl glass-card border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center mb-4 border border-[#c9a84c]/20">
              <ZoomIn className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 text-[#f5f0e8]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Infinite Deep-Time Zoom
            </h4>
            <p className="text-sm text-[#f5f0e8]/60 leading-relaxed font-light">
              Glide from geological epochs spanning millions of years down to exact calendar days with continuous fluid mousewheel and pinch zoom.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-[#5a9bd5]/15 text-[#5a9bd5] flex items-center justify-center mb-4 border border-[#5a9bd5]/20">
              <Layers className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 text-[#f5f0e8]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Multi-Tier Layout Engine
            </h4>
            <p className="text-sm text-[#f5f0e8]/60 leading-relaxed font-light">
              Events automatically stack across non-overlapping tiers. When events pack tightly, they collapse into interactive glowing nodes.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-[#7ab8a0]/15 text-[#7ab8a0] flex items-center justify-center mb-4 border border-[#7ab8a0]/20">
              <Download className="w-5 h-5" />
            </div>
            <h4
              className="text-lg font-bold mb-2 text-[#f5f0e8]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Publication-Grade Export
            </h4>
            <p className="text-sm text-[#f5f0e8]/60 leading-relaxed font-light">
              Export ultra-crisp 2x retina PNG graphics for academic presentations, papers, and essays, or download clean tabular TXT and JSON data.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 bg-[#050810]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#f5f0e8]/40">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} NeeLine</span>
            <span>·</span>
            <span className="text-[#f5f0e8]/60">Devnetra Consultancy</span>
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
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-[#c9a84c]/80 border border-white/[0.06]">
              Number Line Engine
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

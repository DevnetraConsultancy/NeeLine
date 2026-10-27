"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  RotateCcw,
  Landmark,
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

  // Video Viewport States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(60);
  const [hasVideoSource, setHasVideoSource] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState<"video" | "simulation">("video");

  // Check for promotional video presence from environment or static public file
  useEffect(() => {
    const customUrl = process.env.NEXT_PUBLIC_PROMO_VIDEO_URL;
    if (customUrl) {
      setHasVideoSource(true);
      return;
    }

    // Ping /videos/promo.mp4 to see if the user placed a video file
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

  // Simulated playback animation when in simulation mode or when no video file is provided
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setVideoProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 0.5 * playbackSpeed;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

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

  function togglePlay() {
    if (videoRef.current && hasVideoSource) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  }

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  }

  function cycleSpeed() {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVideoProgress(val);
    if (videoRef.current && hasVideoSource && videoDuration) {
      videoRef.current.currentTime = (val / 100) * videoDuration;
    }
  }

  function handleFullscreen() {
    const target = document.getElementById("hero-cinema-viewport");
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative min-h-screen theme-bg flex flex-col overflow-x-hidden selection:bg-[#c9a84c]/30">
      {/* Global Synchronized Navbar */}
      <Navbar />

      {/* Ambient background glows */}
      <div className="ambient-glow w-[680px] h-[680px] bg-[#c9a84c] top-[-100px] left-1/2 -translate-x-1/2 opacity-15" />
      <div className="ambient-glow w-[550px] h-[550px] bg-[#2a4d80] top-[350px] -left-[100px] opacity-15" />
      <div className="ambient-glow w-[480px] h-[480px] bg-[#8a4baf] bottom-[300px] -right-[50px] opacity-15" />

      {/* Large Translucent Archival Grid Pattern (Light Parchment / Dark Obsidian) */}
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      {/* Floating Decorative Translucent Tiles */}
      <div
        className="grid-tile hidden lg:block top-40 left-[8%] w-32 h-32 rounded-2xl animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="grid-tile hidden lg:block top-96 right-[6%] w-44 h-44 rounded-3xl animate-pulse"
        style={{ animationDuration: "12s" }}
      />
      <div
        className="grid-tile hidden lg:block bottom-[500px] left-[5%] w-36 h-36 rounded-2xl animate-pulse"
        style={{ animationDuration: "10s" }}
      />

      {/* Main hero section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20 flex flex-col items-center flex-1 w-full">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/35 text-[#c9a84c] text-xs font-mono mb-8 backdrop-blur-md shadow-[0_0_24px_rgba(201,168,76,0.18)] font-medium">
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
            LARGE HOMEPAGE PROMOTIONAL VIDEO / CINEMA VIEWPORT
            ======================================================== */}
        <section
          id="hero-cinema-viewport"
          className="w-full max-w-5xl rounded-3xl liquid-glass p-4 sm:p-6 mb-20 relative overflow-hidden shadow-2xl group transition-all"
        >
          {/* Top Video Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center border border-[#c9a84c]/30">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h3
                  className="text-base font-bold theme-card-title flex items-center gap-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span>NeeLine Deep-Time Cinema</span>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30">
                    Featured
                  </span>
                </h3>
                <p className="text-[11px] font-mono theme-text-muted">
                  Mathematical Chronology & Algorithmic Horizontal Projection
                </p>
              </div>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl theme-pill self-start sm:self-auto font-mono text-xs">
              <button
                onClick={() => setActiveTab("video")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "video"
                    ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-xs"
                    : "theme-text-muted hover:opacity-100"
                }`}
              >
                Promotional Reel
              </button>
              <button
                onClick={() => setActiveTab("simulation")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === "simulation"
                    ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-xs"
                    : "theme-text-muted hover:opacity-100"
                }`}
              >
                Deep-Time Glide
              </button>
            </div>
          </div>

          {/* Cinematic Viewport Screen (16:9 Aspect Ratio) */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-[#070c16] border border-black/10 dark:border-white/[0.1] shadow-2xl flex items-center justify-center">
            {/* Real HTML5 Video element if source provided */}
            {hasVideoSource && activeTab === "video" ? (
              <video
                ref={videoRef}
                src={process.env.NEXT_PUBLIC_PROMO_VIDEO_URL || "/videos/promo.mp4"}
                className="w-full h-full object-cover"
                playsInline
                muted={isMuted}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setVideoProgress(
                      (videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100
                    );
                    setVideoDuration(videoRef.current.duration || 60);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              /* High-Fidelity Historical Theater Canvas Screen */
              <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden bg-gradient-to-b from-[#091122] via-[#070c16] to-[#04070d]">
                {/* Background Ambient Grid & Radial Aura */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(201, 168, 76, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(201, 168, 76, 0.15) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#c9a84c]/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#4361ee]/15 blur-3xl pointer-events-none" />

                {/* Viewport Overlay Top Meta */}
                <div className="relative z-10 flex items-center justify-between text-xs font-mono text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-semibold text-rose-400 uppercase tracking-widest text-[10px]">
                      {isPlaying ? "Simulating Chrono-Glide" : "Showcase Ready"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <span>UHD 60 FPS</span>
                    <span>•</span>
                    <span>SPATIAL PROJECTION</span>
                  </div>
                </div>

                {/* Center Dynamic Golden Spine & Milestones */}
                <div className="relative z-10 w-full my-auto py-8">
                  <div className="relative w-full h-1 bg-gradient-to-r from-transparent via-[#c9a84c]/60 to-transparent shadow-[0_0_12px_rgba(201,168,76,0.5)]">
                    {/* Animated Gliding Reticle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full border border-[#c9a84c] bg-[#c9a84c]/20 shadow-[0_0_20px_#c9a84c] flex items-center justify-center transition-all duration-100"
                      style={{ left: `${videoProgress}%` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#ebd48a] shadow-[0_0_8px_#ebd48a]" />
                    </div>

                    {/* Permanent 0 CE Marker in center */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
                      <div className="px-2 py-0.5 rounded bg-rose-500/20 border-2 border-rose-500 text-rose-400 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                        0 CE
                      </div>
                      <div className="w-0.5 h-6 bg-rose-500 my-0.5" />
                    </div>

                    {/* Historical Era Waypoints */}
                    <div className="absolute left-[15%] -translate-x-1/2 top-4 text-center">
                      <span className="text-[10px] font-mono text-[#c9a84c]/80 font-semibold block">
                        3000 BCE
                      </span>
                      <span className="text-[8px] font-mono text-white/40 uppercase">
                        Sumerian Dynasty
                      </span>
                    </div>

                    <div className="absolute left-[35%] -translate-x-1/2 top-4 text-center">
                      <span className="text-[10px] font-mono text-[#eab308]/80 font-semibold block">
                        500 BCE
                      </span>
                      <span className="text-[8px] font-mono text-white/40 uppercase">
                        Classical Greece
                      </span>
                    </div>

                    <div className="absolute left-[70%] -translate-x-1/2 top-4 text-center">
                      <span className="text-[10px] font-mono text-[#10b981]/80 font-semibold block">
                        1500 CE
                      </span>
                      <span className="text-[8px] font-mono text-white/40 uppercase">
                        Renaissance
                      </span>
                    </div>

                    <div className="absolute left-[90%] -translate-x-1/2 top-4 text-center">
                      <span className="text-[10px] font-mono text-[#8b5cf6]/80 font-semibold block">
                        2026 CE
                      </span>
                      <span className="text-[8px] font-mono text-white/40 uppercase">
                        AI Frontier
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Big Play Button Overlay (when paused) */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#c9a84c] to-[#ebd48a] text-[#070c16] flex items-center justify-center shadow-[0_0_35px_rgba(201,168,76,0.6)] hover:scale-110 active:scale-95 transition-transform cursor-pointer group/btn"
                      title="Play Promotional Reel"
                    >
                      <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current translate-x-0.5" />
                    </button>
                    <span className="text-xs font-mono text-white/90 mt-4 tracking-wider uppercase font-semibold">
                      Click to Glide Deep Time
                    </span>
                    <span className="text-[10px] font-mono text-white/50 mt-1">
                      {hasVideoSource
                        ? "Playing High-Res Promo Video"
                        : "Ready for /public/videos/promo.mp4"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Liquid Glass Video Control Bar */}
          <div className="mt-3 px-2 py-2 rounded-2xl liquid-glass flex flex-col gap-2">
            {/* Scrubber Range Bar */}
            <div className="relative w-full flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={videoProgress}
                onChange={handleSeek}
                className="w-full h-1.5 bg-black/20 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c9a84c]"
              />
            </div>

            {/* Playback Controls & Metrics */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg theme-pill hover:border-[#c9a84c]/60 cursor-pointer transition-all"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-[#c9a84c]" />
                  ) : (
                    <Play className="w-4 h-4 text-[#c9a84c]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setVideoProgress(0);
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                  className="p-1.5 rounded-lg theme-pill hover:border-[#c9a84c]/60 cursor-pointer transition-all"
                  title="Reset to Beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg theme-pill hover:border-[#c9a84c]/60 cursor-pointer transition-all"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 opacity-70" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#c9a84c]" />
                  )}
                </button>

                <span className="text-[11px] theme-text-muted hidden sm:inline">
                  {Math.floor((videoProgress / 100) * videoDuration)}s / {Math.floor(videoDuration)}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={cycleSpeed}
                  className="px-2 py-1 rounded-lg theme-pill text-[11px] font-semibold hover:border-[#c9a84c]/60 cursor-pointer transition-all"
                  title="Cycle Playback Speed"
                >
                  {playbackSpeed}x Speed
                </button>

                <button
                  onClick={handleFullscreen}
                  className="p-1.5 rounded-lg theme-pill hover:border-[#c9a84c]/60 cursor-pointer transition-all"
                  title="Expand to Fullscreen Cinema"
                >
                  <Maximize2 className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Sample Timeline Showcase */}
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
                Click any milestone below to simulate real-time temporal focusing.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-3 py-1.5 rounded-xl border border-[#c9a84c]/30 self-start sm:self-auto font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Span: 5,226 Years Illustrated</span>
            </div>
          </div>

          {/* Simulated Number Line Spine */}
          <div className="relative py-12 px-4 sm:px-8 preview-track rounded-2xl overflow-x-auto shadow-inner">
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
          <div className="mt-6 p-4 rounded-2xl preview-spotlight flex items-center justify-between">
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
            <span className="text-[11px] font-mono text-[#c9a84c] bg-[#c9a84c]/15 px-2.5 py-1 rounded-lg border border-[#c9a84c]/30 font-semibold shadow-xs">
              Active Focus
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mb-20">
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

        {/* Closing Obsidian Glass Banner */}
        <div className="w-full max-w-5xl p-8 sm:p-12 rounded-3xl obsidian-glass relative text-center mb-16 overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#ebd48a] text-xs font-mono">
              <Landmark className="w-3.5 h-3.5" />
              <span>Academic & Scholarly Research</span>
            </div>
            <h3
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Plot Your Historical Horizons?
            </h3>
            <p className="text-sm text-slate-300 font-light leading-relaxed">
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

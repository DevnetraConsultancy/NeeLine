"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Compass,
  Landmark,
  Library,
  Mail,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

export default function Footer() {
  const [buildTime, setBuildTime] = useState<string>("");
  const currentYear = new Date().getFullYear();

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
        // fallback to empty
      }
    }
  }, []);

  return (
    <footer className="relative z-20 w-full theme-footer border-t border-black/[0.08] dark:border-white/[0.08] transition-colors">
      {/* Subtle top edge specular sheen */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12">
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-10 border-b border-black/[0.06] dark:border-white/[0.06]">
          {/* Brand & Purpose Column (Spans 2 on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group"
              title="NeeLine · Number Line Visualizer"
            >
              {/* Refined Brand Emblem */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c9a84c] via-[#ebd48a] to-[#a3802c] p-[1.5px] shadow-[0_0_16px_rgba(201,168,76,0.28)] group-hover:shadow-[0_0_24px_rgba(201,168,76,0.45)] transition-all">
                <div className="w-full h-full rounded-[10px] bg-[#070c16] flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-[#c9a84c] group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-lg font-bold tracking-tight leading-none group-hover:text-[#c9a84c] transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Nee<span className="text-[#c9a84c]">Line</span>
                </span>
                <span className="text-[10px] font-mono opacity-60 tracking-wider uppercase mt-1">
                  Number Line Visualizer
                </span>
              </div>
            </Link>

            <p className="text-xs theme-text-muted leading-relaxed font-light max-w-sm">
              An algorithmic horizontal deep-time canvas engineered for historians, researchers,
              and academic institutions. Plotting civilization from prehistoric antiquity to the
              modern horizon with mathematical precision.
            </p>

            {/* Academic Credential & Contact Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href="mailto:devnetraconsultancy@gmail.com"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg theme-pill hover:border-[#c9a84c]/60 text-[11px] font-mono transition-all"
                title="Academic Inquiries & Support"
              >
                <Mail className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Contact Desk</span>
              </a>

              <a
                href="https://www.instagram.com/scien_nee/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg theme-pill hover:border-[#c9a84c]/60 text-[11px] font-mono transition-all"
                title="Follow @scien_nee on Instagram"
              >
                <Compass className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>@scien_nee</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/25 text-[#c9a84c] text-[10px] font-mono font-medium">
                <GraduationCap className="w-3 h-3" />
                <span>Academic Edition</span>
              </span>
            </div>
          </div>

          {/* Column 1: Engine Architecture */}
          <div className="space-y-3">
            <h5 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#c9a84c] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </h5>
            <ul className="space-y-2 text-xs font-mono theme-text-muted">
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Deep-Time Canvas
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Golden Number Line
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Multi-Tier Dynamic Stacking
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Focal Spatial Memory
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Retina 2x Export Engine
                </span>
              </li>
            </ul>
          </div>

          {/* Column 2: Historical Horizons */}
          <div className="space-y-3">
            <h5 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#c9a84c] flex items-center gap-2">
              <Landmark className="w-3.5 h-3.5" />
              <span>Chronicles</span>
            </h5>
            <ul className="space-y-2 text-xs font-mono theme-text-muted">
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Ancient Antiquity (BCE)
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Classical Civilizations
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Medieval & Renaissance
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Industrial & Space Age
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Modern AI Frontier
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Collaboration & Governance */}
          <div className="space-y-3">
            <h5 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#c9a84c] flex items-center gap-2">
              <Library className="w-3.5 h-3.5" />
              <span>Academic</span>
            </h5>
            <ul className="space-y-2 text-xs font-mono theme-text-muted">
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Devnetra Consultancy
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Scholarly Peer Review
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Zero Data Loss Policy
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Client-Side Privacy
                </span>
              </li>
              <li>
                <span className="hover:text-[#c9a84c] transition-colors cursor-default">
                  Citation & Attribution
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Compact Status & Copyright Row */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono theme-text-muted">
          {/* Left: Copyright & Academic Partner */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-center md:text-left">
            <span>© {currentYear} NeeLine · Number Line Visualizer</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Developed in Collaboration with Academia | Devnetra Consultancy
            </span>
          </div>

          {/* Right: Release status badge & build update */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md theme-pill text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Production Release
              </span>
            </span>

            {buildTime && (
              <span className="text-[11px] opacity-75 hidden lg:inline">
                Build: {buildTime}
              </span>
            )}

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
              v0.1.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

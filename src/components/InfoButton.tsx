"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  HelpCircle,
  X,
  Keyboard,
  MousePointer,
  Mail,
  Layers,
  Download,
  Palette,
  Sun,
  Plus,
} from "lucide-react";

export default function InfoButton() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"shortcuts" | "features" | "about">("shortcuts");

  return (
    <>
      {/* Question mark trigger only - no text */}
      <button
        onClick={() => setShowModal(true)}
        className="w-8 h-8 rounded-xl theme-pill hover:border-[#c9a84c]/60 flex items-center justify-center cursor-pointer font-mono transition-all"
        title="Guide & Studio Manual (Shortcuts, Gestures & Features)"
        aria-label="Guide & Studio Manual"
      >
        <HelpCircle className="w-4 h-4 text-[#c9a84c]" />
      </button>

      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div
              className="glass-panel rounded-2xl p-6 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.12] max-h-[88vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.08] dark:border-white/[0.08] mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#c9a84c] to-[#ecd58e] p-[1.5px] shadow-[0_0_15px_rgba(201,168,76,0.25)]">
                    <div className="w-full h-full rounded-full bg-[#070c16] flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-[#c9a84c]"
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
                  <div>
                    <h1
                      className="text-base font-bold theme-card-title leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Nee<span className="text-[#c9a84c]">Line</span> Guide & Studio Manual
                    </h1>
                    <p className="text-[11px] font-mono theme-text-muted mt-0.5">
                      Visualize History on a Number Line
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Tab Navigation */}
              <div className="flex items-center p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.08] mb-5 font-mono text-xs">
                <button
                  onClick={() => setActiveTab("shortcuts")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center font-medium ${
                    activeTab === "shortcuts"
                      ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-sm"
                      : "theme-text-muted hover:opacity-100"
                  }`}
                >
                  Shortcuts
                </button>
                <button
                  onClick={() => setActiveTab("features")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center font-medium ${
                    activeTab === "features"
                      ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-sm"
                      : "theme-text-muted hover:opacity-100"
                  }`}
                >
                  Studio Icons & Tools
                </button>
                <button
                  onClick={() => setActiveTab("about")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center font-medium ${
                    activeTab === "about"
                      ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold shadow-sm"
                      : "theme-text-muted hover:opacity-100"
                  }`}
                >
                  About
                </button>
              </div>

              {/* Tab 1: Shortcuts & Controls */}
              {activeTab === "shortcuts" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#c9a84c] mb-2.5 flex items-center gap-1.5 font-semibold">
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Desktop Controls</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">Fit all events into frame</span>
                        <kbd className="px-2.5 py-1 rounded-md bg-black/[0.06] dark:bg-[#070c16] text-[#c9a84c] font-mono text-xs border border-black/10 dark:border-white/[0.1] shadow-sm font-semibold">
                          0
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">Add milestone at exact coordinate</span>
                        <kbd className="px-2.5 py-1 rounded-md bg-black/[0.06] dark:bg-[#070c16] text-[#c9a84c] font-mono text-xs border border-black/10 dark:border-white/[0.1] shadow-sm font-semibold">
                          Click Axis Line
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">Pan along the number line</span>
                        <kbd className="px-2.5 py-1 rounded-md bg-black/[0.06] dark:bg-[#070c16] text-[#c9a84c] font-mono text-xs border border-black/10 dark:border-white/[0.1] shadow-sm font-semibold">
                          Drag Canvas
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">Continuous temporal zoom</span>
                        <kbd className="px-2.5 py-1 rounded-md bg-black/[0.06] dark:bg-[#070c16] text-[#c9a84c] font-mono text-xs border border-black/10 dark:border-white/[0.1] shadow-sm font-semibold">
                          Scroll Wheel / + -
                        </kbd>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#c9a84c] mb-2.5 flex items-center gap-1.5 font-semibold">
                      <MousePointer className="w-3.5 h-3.5" />
                      <span>Touchscreen Gestures</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">1-Finger Drag</span>
                        <span className="font-mono text-[#c9a84c] text-xs font-medium">Smooth Pan</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs">
                        <span className="theme-text-muted">2-Finger Pinch</span>
                        <span className="font-mono text-[#c9a84c] text-xs font-medium">Continuous Zoom</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Studio Icons & Tools */}
              {activeTab === "features" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#5a9bd5]/15 text-[#5a9bd5] flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold theme-card-title">
                        Import / Export Icon
                      </h4>
                      <p className="text-[11px] theme-text-muted mt-0.5 font-light leading-relaxed">
                        Top studio icon allowing one-click JSON dataset import, 2x Retina PNG graphic export, and tabular TXT export.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#b07cc6]/15 text-[#b07cc6] flex items-center justify-center shrink-0 mt-0.5">
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold theme-card-title">
                        Canvas Settings Icon
                      </h4>
                      <p className="text-[11px] theme-text-muted mt-0.5 font-light leading-relaxed">
                        Customize canvas background, spine axis, tick marks, typography, and toggle Add/Remove border around gap year boxes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center shrink-0 mt-0.5">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold theme-card-title">
                        Add Milestone Icon
                      </h4>
                      <p className="text-[11px] theme-text-muted mt-0.5 font-light leading-relaxed">
                        Add a new chronological event or click directly anywhere on the central number line axis.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#ecd58e]/20 text-[#c9a84c] flex items-center justify-center shrink-0 mt-0.5">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold theme-card-title">
                        Light / Dark Theme Icon
                      </h4>
                      <p className="text-[11px] theme-text-muted mt-0.5 font-light leading-relaxed">
                        Toggles application interface theme in global top bar. Canvas color continues to be decided by Canvas Settings.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7ab8a0]/15 text-[#7ab8a0] flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold theme-card-title">
                        Even vs. Proportional Spacing & Gaps
                      </h4>
                      <p className="text-[11px] theme-text-muted mt-0.5 font-light leading-relaxed">
                        Switch between dense even layout and true physical time proportion with elapsed year gap indicators.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: About & Devnetra */}
              {activeTab === "about" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />
                      <h3
                        className="text-sm font-bold theme-card-title"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Developed in Collaboration with Academia | Devnetra Consultancy
                      </h3>
                    </div>
                    <p className="text-xs theme-text-muted leading-relaxed font-light mb-4">
                      NeeLine is built with architectural precision to bridge historical pedagogy, research chronicles, and human temporal curiosity on an interactive coordinate axis.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-xs font-mono">
                      <a
                        href="mailto:devnetraconsultancy@gmail.com"
                        className="flex items-center gap-2.5 theme-text-muted hover:text-[#c9a84c] transition-colors p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                      >
                        <Mail className="w-4 h-4 text-[#c9a84c]" />
                        <span>devnetraconsultancy@gmail.com</span>
                      </a>
                      <a
                        href="https://www.instagram.com/scien_nee/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 theme-text-muted hover:text-[#c9a84c] transition-colors p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                      >
                        <svg
                          className="w-4 h-4 text-[#c9a84c] shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                        <span>@scien_nee on Instagram</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="mt-5 pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer shadow-md"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

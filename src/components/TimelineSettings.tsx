"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Palette, Sparkles, CheckSquare, Square } from "lucide-react";

interface TimelineSettingsProps {
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
  showGapBorder: boolean;
  onToggleGapBorder: (show: boolean) => void;
  onSave: (colors: {
    bgColor: string;
    spineColor: string;
    tickColor: string;
    textColor: string;
  }) => Promise<void>;
  onClose: () => void;
}

const PRESET_THEMES = [
  {
    name: "Obsidian Gold",
    bg: "#070c16",
    spine: "#c9a84c",
    tick: "#c9a84c",
    text: "#f5f0e8",
  },
  {
    name: "Parchment",
    bg: "#f5f0e8",
    spine: "#2c2c2c",
    tick: "#2c2c2c",
    text: "#1a1a1a",
  },
  {
    name: "Midnight Navy",
    bg: "#0a1628",
    spine: "#5a9bd5",
    tick: "#5a9bd5",
    text: "#e8f0fe",
  },
  {
    name: "Ancient Forest",
    bg: "#0a1a14",
    spine: "#7ab8a0",
    tick: "#7ab8a0",
    text: "#f0f8f4",
  },
  {
    name: "Monochrome",
    bg: "#0c0c0c",
    spine: "#e0e0e0",
    tick: "#e0e0e0",
    text: "#ffffff",
  },
];

const QUICK_BG_COLORS = [
  "#070c16", "#0a1628", "#0f1f38", "#1a0a28", "#0a2818", "#1a1a1a", "#f5f0e8",
];

const QUICK_ACCENT_COLORS = [
  "#c9a84c", "#e8d5a3", "#7ab8a0", "#5a9bd5", "#d4786c", "#b07cc6", "#ffffff",
];

const QUICK_TEXT_COLORS = [
  "#f5f0e8", "#ffffff", "#e8f0fe", "#f0f8f4", "#1a1a1a",
];

export default function TimelineSettings({
  bgColor,
  spineColor,
  tickColor,
  textColor,
  showGapBorder,
  onToggleGapBorder,
  onSave,
  onClose,
}: TimelineSettingsProps) {
  const [mounted, setMounted] = useState(false);
  const [bg, setBg] = useState(bgColor);
  const [spine, setSpine] = useState(spineColor);
  const [tick, setTick] = useState(tickColor);
  const [text, setText] = useState(textColor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSave() {
    setSaving(true);
    await onSave({
      bgColor: bg,
      spineColor: spine,
      tickColor: tick,
      textColor: text,
    });
    setSaving(false);
    onClose();
  }

  function applyPreset(preset: typeof PRESET_THEMES[0]) {
    setBg(preset.bg);
    setSpine(preset.spine);
    setTick(preset.tick);
    setText(preset.text);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Palette className="w-3 h-3" />
            </div>
            <div>
              <h2
                className="text-xs font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Canvas Settings
              </h2>
              <p className="text-[9.5px] font-mono theme-text-muted">
                Palette, spine coordinates & gap box styling
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Body */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Live Mini-Canvas Preview */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1 font-medium">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Live Canvas Preview</span>
            </div>
            <div
              className="rounded-lg p-2.5 border border-black/15 dark:border-white/[0.1] relative overflow-hidden transition-colors duration-200 shadow-inner"
              style={{ backgroundColor: bg }}
            >
              <div className="relative py-2 flex items-center justify-between px-4">
                {/* Spine Line */}
                <div
                  className="absolute left-3 right-3 h-[2px] transition-colors"
                  style={{ backgroundColor: spine }}
                />

                {/* Left Tick */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-1 h-3.5 rounded-full transition-colors"
                    style={{ backgroundColor: tick }}
                  />
                  <span
                    className="text-[9px] font-mono mt-1"
                    style={{ color: text }}
                  >
                    44 BCE
                  </span>
                </div>

                {/* Gap Pill */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono transition-all"
                    style={{
                      border: showGapBorder ? `1px solid ${spine}` : "none",
                      backgroundColor: bg,
                      color: text,
                      opacity: 0.85,
                    }}
                  >
                    44 yrs
                  </div>
                </div>

                {/* Right Tick (Year Zero Milestone) */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-1.5 h-3.5 rounded-full border border-[#ef4444] transition-colors"
                    style={{ backgroundColor: "#ef4444" }}
                  />
                  <span
                    className="text-[9px] font-mono font-bold mt-1 text-[#ef4444]"
                  >
                    0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Gap Year Box Border Toggle */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08]">
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => onToggleGapBorder(!showGapBorder)}
            >
              <div className="text-[#c9a84c]">
                {showGapBorder ? (
                  <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Square className="w-3.5 h-3.5 opacity-40" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold theme-card-title block leading-tight">
                  Gap Year Box Border
                </span>
                <span className="text-[9.5px] font-mono theme-text-muted block">
                  {showGapBorder ? "Border active on gap year indicator boxes" : "Border removed (clean borderless gap pill)"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleGapBorder(!showGapBorder)}
              className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer font-medium shrink-0 ${
                showGapBorder
                  ? "bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/40"
                  : "theme-pill opacity-70"
              }`}
            >
              {showGapBorder ? "Border ON" : "Border OFF"}
            </button>
          </div>

          {/* Curated Theme Presets */}
          <div>
            <span className="block text-[10px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
              Curated Theme Presets
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PRESET_THEMES.map((preset) => {
                const isActive =
                  bg === preset.bg &&
                  spine === preset.spine &&
                  tick === preset.tick &&
                  text === preset.text;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`p-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                      isActive
                        ? "border-[#c9a84c] ring-1 ring-[#c9a84c]/50 bg-[#c9a84c]/10"
                        : "border-black/10 dark:border-white/[0.08] hover:border-[#c9a84c]/40 theme-pill"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                        style={{ backgroundColor: preset.bg }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.spine }}
                      />
                    </div>
                    <div className="text-[10.5px] font-semibold theme-card-title truncate leading-tight">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers - Compact 1-line rows */}
          <div className="space-y-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
            {/* Background Color */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono theme-text-muted shrink-0 w-24">
                Background:
              </span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-6 h-6 rounded border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-18 px-1.5 py-0.5 rounded theme-input text-[10.5px] font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto">
                  {QUICK_BG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBg(c)}
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Spine & Ticks */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono theme-text-muted shrink-0 w-24">
                Spine & Ticks:
              </span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <input
                  type="color"
                  value={spine}
                  onChange={(e) => {
                    setSpine(e.target.value);
                    setTick(e.target.value);
                  }}
                  className="w-6 h-6 rounded border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={spine}
                  onChange={(e) => {
                    setSpine(e.target.value);
                    setTick(e.target.value);
                  }}
                  className="w-18 px-1.5 py-0.5 rounded theme-input text-[10.5px] font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto">
                  {QUICK_ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSpine(c);
                        setTick(c);
                      }}
                      className="w-4 h-4 rounded-full shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Text */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-mono theme-text-muted shrink-0 w-24">
                Canvas Text:
              </span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <input
                  type="color"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-6 h-6 rounded border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-18 px-1.5 py-0.5 rounded theme-input text-[10.5px] font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto">
                  {QUICK_TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setText(c)}
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold px-3.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {saving ? "Applying..." : "Apply Palette"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

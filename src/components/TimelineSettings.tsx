"use client";

import { useState } from "react";
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
    name: "Pure Monochrome",
    bg: "#0c0c0c",
    spine: "#e0e0e0",
    tick: "#e0e0e0",
    text: "#ffffff",
  },
];

const BG_COLORS = [
  "#070c16", "#0a1628", "#0f1f38", "#1a0a28",
  "#0a2818", "#1a1a1a", "#28201a", "#0a0a0a",
  "#1e293b", "#f5f0e8",
];

const ACCENT_COLORS = [
  "#c9a84c", "#e8d5a3", "#7ab8a0", "#5a9bd5",
  "#d4786c", "#b07cc6", "#e8a87c", "#7cc6d4",
  "#d4a5c9", "#a8b87a", "#f5f0e8", "#ffffff",
  "#8b8b8b", "#333333",
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
  const [bg, setBg] = useState(bgColor);
  const [spine, setSpine] = useState(spineColor);
  const [tick, setTick] = useState(tickColor);
  const [text, setText] = useState(textColor);
  const [saving, setSaving] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - Renamed to Canvas Settings */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Canvas Settings
              </h2>
              <p className="text-[11px] font-mono theme-text-muted">
                Colors, chromatic theme & coordinate gap styling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Live Mini-Canvas Preview with Gap Box */}
          <div>
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Live Canvas Preview</span>
            </label>
            <div
              className="rounded-xl p-4 border border-black/15 dark:border-white/[0.1] relative overflow-hidden transition-colors duration-300 shadow-inner"
              style={{ backgroundColor: bg }}
            >
              <div className="relative py-4 flex items-center justify-between px-6">
                {/* Simulated spine line */}
                <div
                  className="absolute left-4 right-4 h-[2px] transition-colors"
                  style={{ backgroundColor: spine }}
                />

                {/* Left Tick */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-1.5 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: tick }}
                  />
                  <span
                    className="text-[10px] font-mono mt-2"
                    style={{ color: text }}
                  >
                    44 BCE
                  </span>
                </div>

                {/* Simulated Gap Box */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-mono transition-all"
                    style={{
                      border: showGapBorder ? `1px solid ${spine}` : "none",
                      backgroundColor: bg,
                      color: text,
                      opacity: 0.8,
                    }}
                  >
                    44 yrs
                  </div>
                </div>

                {/* Right Tick */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-1.5 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: tick }}
                  />
                  <span
                    className="text-[10px] font-mono mt-2"
                    style={{ color: text }}
                  >
                    0 CE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gap Year Box Border Setting (Add/Remove Border) */}
          <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => onToggleGapBorder(!showGapBorder)}
                className="mt-0.5 text-[#c9a84c] hover:opacity-80 transition-opacity cursor-pointer"
              >
                {showGapBorder ? (
                  <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Square className="w-4 h-4 opacity-40" />
                )}
              </button>
              <div>
                <label
                  onClick={() => onToggleGapBorder(!showGapBorder)}
                  className="text-xs font-semibold theme-card-title cursor-pointer block"
                >
                  Gap Year Box Border
                </label>
                <p className="text-[11px] font-mono theme-text-muted mt-0.5 leading-relaxed">
                  {showGapBorder
                    ? "Border active on gap year indicator boxes"
                    : "Border removed (clean borderless gap pill)"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleGapBorder(!showGapBorder)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
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
            <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-2 font-medium">
              Curated Theme Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                      isActive
                        ? "border-[#c9a84c] ring-1 ring-[#c9a84c]/50 bg-[#c9a84c]/10"
                        : "border-black/10 dark:border-white/[0.08] hover:border-[#c9a84c]/40 theme-pill"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                        style={{ backgroundColor: preset.bg }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.spine }}
                      />
                    </div>
                    <div className="text-xs font-semibold theme-card-title truncate">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Canvas Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-28 px-2.5 py-1.5 rounded-xl theme-input text-xs font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {BG_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBg(c)}
                      className="w-5 h-5 rounded-full border border-black/20 dark:border-white/20 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Spine & Tick Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={spine}
                  onChange={(e) => {
                    setSpine(e.target.value);
                    setTick(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={spine}
                  onChange={(e) => {
                    setSpine(e.target.value);
                    setTick(e.target.value);
                  }}
                  className="w-28 px-2.5 py-1.5 rounded-xl theme-input text-xs font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {ACCENT_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSpine(c);
                        setTick(c);
                      }}
                      className="w-5 h-5 rounded-full shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono theme-text-muted uppercase tracking-wider mb-1.5 font-medium">
                Canvas Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-black/15 dark:border-white/10 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-28 px-2.5 py-1.5 rounded-xl theme-input text-xs font-mono"
                />
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {["#f5f0e8", "#ffffff", "#1a1a1a", "#e8f0fe", "#f0f8f4"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setText(c)}
                      className="w-5 h-5 rounded-full border border-black/20 dark:border-white/20 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer disabled:opacity-50 shadow-md"
            >
              {saving ? "Applying..." : "Apply Palette"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

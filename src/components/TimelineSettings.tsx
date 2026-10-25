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
      <div className="w-full max-w-md rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/[0.1] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - Renamed to Canvas Settings */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold text-[#f5f0e8] leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Canvas Settings
              </h2>
              <p className="text-[11px] font-mono text-[#f5f0e8]/40">
                Colors, chromatic theme & coordinate gap styling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#f5f0e8]/40 hover:text-[#f5f0e8] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Live Mini-Canvas Preview with Gap Box */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Live Canvas Preview</span>
            </label>
            <div
              className="rounded-xl p-4 border border-white/[0.1] relative overflow-hidden transition-colors duration-300 shadow-inner"
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
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                onClick={() => onToggleGapBorder(!showGapBorder)}
                className="mt-0.5 text-[#c9a84c] hover:opacity-80 transition-opacity cursor-pointer"
              >
                {showGapBorder ? (
                  <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Square className="w-4 h-4 text-[#f5f0e8]/30" />
                )}
              </button>
              <div>
                <label
                  onClick={() => onToggleGapBorder(!showGapBorder)}
                  className="text-xs font-semibold text-[#f5f0e8] cursor-pointer block"
                >
                  Gap Year Box Border
                </label>
                <p className="text-[11px] font-mono text-[#f5f0e8]/45 mt-0.5 leading-relaxed">
                  {showGapBorder
                    ? "Border active on gap year indicator boxes"
                    : "Border removed (clean borderless gap pill)"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleGapBorder(!showGapBorder)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                showGapBorder
                  ? "bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/30"
                  : "bg-white/[0.04] text-[#f5f0e8]/40 border-white/[0.08]"
              }`}
            >
              {showGapBorder ? "Border ON" : "Border OFF"}
            </button>
          </div>

          {/* Curated Theme Presets */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2">
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
                    className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all text-left flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-[#c9a84c]/20 border-[#c9a84c] text-[#f5f0e8] shadow-sm"
                        : "bg-white/[0.03] border-white/[0.08] text-[#f5f0e8]/60 hover:border-white/20 hover:text-[#f5f0e8]"
                    }`}
                  >
                    <span className="truncate">{preset.name}</span>
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 ml-1.5 border border-white/20"
                      style={{ backgroundColor: preset.spine }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Palette */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2">
              Canvas Background
            </label>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={`bg-${c}`}
                  type="button"
                  onClick={() => setBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    bg === c
                      ? "border-white scale-110 shadow-md ring-2 ring-white/20"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Central Axis Spine Line */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2">
              Central Axis Line
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`spine-${c}`}
                  type="button"
                  onClick={() => setSpine(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    spine === c
                      ? "border-white scale-110 shadow-md ring-2 ring-white/20"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Tick Marks & Origin */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2">
              Tick Marks & Origin
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`tick-${c}`}
                  type="button"
                  onClick={() => setTick(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    tick === c
                      ? "border-white scale-110 shadow-md ring-2 ring-white/20"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Typography Color */}
          <div>
            <label className="block text-[11px] font-mono text-[#f5f0e8]/40 uppercase tracking-wider mb-2">
              Canvas Typography
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`text-${c}`}
                  type="button"
                  onClick={() => setText(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    text === c
                      ? "border-white scale-110 shadow-md ring-2 ring-white/20"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full btn-gold py-2.5 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#070c16]/40 border-t-[#070c16] rounded-full animate-spin" />
                  <span>Saving Canvas Settings...</span>
                </>
              ) : (
                <span>Save Canvas Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

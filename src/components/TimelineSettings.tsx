"use client";

import { useState } from "react";

interface TimelineSettingsProps {
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
  onSave: (colors: {
    bgColor: string;
    spineColor: string;
    tickColor: string;
    textColor: string;
  }) => Promise<void>;
  onClose: () => void;
}

const BG_COLORS = [
  "#0a1628", "#0f1f38", "#1a0a28", "#0a2818",
  "#1a1a1a", "#28201a", "#0a0a0a", "#f5f0e8",
  "#1e293b", "#0f172a",
];

const ACCENT_COLORS = [
  "#c9a84c", "#e8d5a3", "#7ab8a0", "#5a9bd5",
  "#d4786c", "#b07cc6", "#e8a87c", "#7cc6d4",
  "#d4a5c9", "#a8b87a", "#f5f0e8", "#ffffff",
  "#8b8b8b", "#4a4a4a",
];

export default function TimelineSettings({
  bgColor,
  spineColor,
  tickColor,
  textColor,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm mx-4 rounded-xl bg-[#0f1f38] border border-[#c9a84c]/20 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#c9a84c]/10">
          <h2
            className="text-lg font-semibold text-[#f5f0e8]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Timeline Colors
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#f5f0e8]/30 hover:text-[#f5f0e8]/60 hover:bg-[#c9a84c]/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Theme Presets */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-2 uppercase tracking-wider">
              Theme Presets
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBg("#0a1628");
                  setSpine("#c9a84c");
                  setTick("#c9a84c");
                  setText("#f5f0e8");
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-[#c9a84c]/20 text-[#c9a84c] text-xs font-medium hover:bg-[#c9a84c]/10 transition-colors text-center"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Dark
              </button>
              <button
                onClick={() => {
                  setBg("#f5f0e8");
                  setSpine("#2c2c2c");
                  setTick("#2c2c2c");
                  setText("#1a1a1a");
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-[#c9a84c]/20 text-[#c9a84c] text-xs font-medium hover:bg-[#c9a84c]/10 transition-colors text-center"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Light
              </button>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-2 uppercase tracking-wider">
              Background
            </label>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={`bg-${c}`}
                  onClick={() => setBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    bg === c ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Spine Color */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-2 uppercase tracking-wider">
              Spine Line
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`spine-${c}`}
                  onClick={() => setSpine(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    spine === c ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Tick Color */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-2 uppercase tracking-wider">
              Tick Marks
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`tick-${c}`}
                  onClick={() => setTick(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    tick === c ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs text-[#f5f0e8]/40 mb-2 uppercase tracking-wider">
              Text
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={`text-${c}`}
                  onClick={() => setText(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    text === c ? "border-white scale-110" : "border-white/20 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-lg p-4 border border-[#c9a84c]/10"
            style={{ backgroundColor: bg }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tick }} />
              <div className="flex-1 h-0.5" style={{ backgroundColor: spine }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tick }} />
            </div>
            <p
              className="text-xs mt-2 text-center"
              style={{ color: text, fontFamily: "var(--font-display)" }}
            >
              Preview text
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-[#c9a84c] text-[#0a1628] font-semibold text-sm hover:bg-[#d4b65a] transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Apply Colors"}
          </button>
        </div>
      </div>
    </div>
  );
}

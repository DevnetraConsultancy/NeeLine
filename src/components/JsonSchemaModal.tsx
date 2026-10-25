"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Code, Copy, Check, Download, X, Sparkles, BookOpen } from "lucide-react";

interface JsonSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_JSON_CALLSET = {
  timeline: {
    name: "Mediterranean Antiquity & Empires",
    description: "Chronicle of ancient Mediterranean civilizations, classical periods, and defining milestones.",
  },
  layers: [
    { name: "Classical Greece", color: "#38bdf8" },
    { name: "Roman Republic & Empire", color: "#c9a84c" },
  ],
  events: [
    {
      title: "Founding of the Roman Republic",
      year: 509,
      isBce: true,
      month: null,
      day: null,
      color: "#c9a84c",
      layer: "Roman Republic & Empire",
      description: "Overthrow of the Roman monarchy and establishment of the Republican government.",
    },
    {
      title: "Classical Period of Greece",
      year: 510,
      isBce: true,
      endYear: 323,
      endIsBce: true,
      color: "#38bdf8",
      layer: "Classical Greece",
      description: "Era between the Persian Wars and the death of Alexander the Great. Spans across 187 years with horizontal bracket.",
    },
    {
      title: "Pax Romana Era",
      year: 27,
      isBce: true,
      endYear: 180,
      endIsBce: false,
      color: "#c9a84c",
      layer: "Roman Republic & Empire",
      description: "Extensive period of peace and imperial order initiated under Caesar Augustus.",
    },
    {
      title: "Fall of the Western Roman Empire",
      year: 476,
      isBce: false,
      month: 9,
      day: 4,
      color: "#f43f5e",
      layer: "Roman Republic & Empire",
      description: "Deposition of Emperor Romulus Augustulus by Odoacer.",
    },
  ],
};

export default function JsonSchemaModal({ isOpen, onClose }: JsonSchemaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const jsonString = JSON.stringify(SAMPLE_JSON_CALLSET, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neeline-chronicle-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.12] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-base font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nee<span className="text-[#c9a84c]">Line</span> JSON Schema & Callset Spec
              </h2>
              <p className="text-[11px] font-mono theme-text-muted">
                Standard format for Point Milestones & Horizontal Bracket Periods
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close (X)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Spec Summary Card */}
          <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold theme-card-title font-sans">
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>Specification Overview</span>
            </div>
            <p className="text-[11px] theme-text-muted leading-relaxed font-sans font-light">
              NeeLine accepts either a full chronicle payload (<code className="text-[#c9a84c] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{"{ timeline, layers, events }"}</code>) or a flat array of events (<code className="text-[#c9a84c] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{"[ { ... } ]"}</code>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                <span className="font-semibold text-[#c9a84c] block mb-0.5">Point Milestone</span>
                <span className="theme-text-muted font-sans text-[10.5px]">Requires <code className="text-[#5a9bd5]">year</code> & <code className="text-[#5a9bd5]">title</code>. Optional <code className="text-[#5a9bd5]">isBce</code>, <code className="text-[#5a9bd5]">month</code>, <code className="text-[#5a9bd5]">day</code>, <code className="text-[#5a9bd5]">description</code>, <code className="text-[#5a9bd5]">layer</code>, <code className="text-[#5a9bd5]">color</code>.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                <span className="font-semibold text-[#38bdf8] block mb-0.5">Horizontal Bracket Span</span>
                <span className="theme-text-muted font-sans text-[10.5px]">Add <code className="text-[#38bdf8]">endYear</code> & <code className="text-[#38bdf8]">endIsBce</code> to render a horizontal square bracket spanning between the two dates with centered label and notes.</span>
              </div>
            </div>
          </div>

          {/* Interactive Code Box */}
          <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/[0.1] bg-[#070c16]">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/[0.06] text-[11px] text-white/60">
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>neeline-chronicle-template.json</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c9a84c]" />}
                <span>{copied ? "Copied!" : "Copy JSON"}</span>
              </button>
            </div>

            <pre className="p-4 text-[11px] leading-relaxed text-[#f5f0e8] overflow-x-auto max-h-64 selection:bg-[#c9a84c]/30 font-mono">
              <code>{jsonString}</code>
            </pre>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl theme-pill hover:border-[#c9a84c]/60 text-xs font-mono transition-colors cursor-pointer text-[#c9a84c]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Starter Template</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-gold px-5 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer shadow-md"
          >
            Close Schema
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

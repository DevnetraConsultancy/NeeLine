"use client";

import { useState } from "react";
import { Check, Copy, Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { downloadBlob } from "@/lib/client/export";

const TEMPLATE = {
  timeline: {
    name: "Mediterranean Antiquity & Empires",
    description: "Chronicle of ancient Mediterranean civilizations, classical periods, and defining milestones.",
  },
  layers: [
    { name: "Classical Greece", color: "#38bdf8" },
    { name: "Roman Republic & Empire", color: "#c9a84c" },
  ],
  events: [
    { title: "Founding of the Roman Republic", year: 509, isBce: true, month: null, day: null, color: "#c9a84c", layer: "Roman Republic & Empire", description: "Overthrow of the Roman monarchy and establishment of the Republican government." },
    { title: "Classical Period of Greece", year: 510, isBce: true, endYear: 323, endIsBce: true, color: "#38bdf8", layer: "Classical Greece", description: "Era between the Persian Wars and the death of Alexander the Great." },
    { title: "Pax Romana Era", year: 27, isBce: true, endYear: 180, endIsBce: false, color: "#c9a84c", layer: "Roman Republic & Empire", description: "Extensive period of peace and imperial order initiated under Caesar Augustus." },
    { title: "Fall of the Western Roman Empire", year: 476, isBce: false, month: 9, day: 4, color: "#f43f5e", layer: "Roman Republic & Empire", description: "Deposition of Emperor Romulus Augustulus by Odoacer." },
  ],
};

const TEMPLATE_TEXT = JSON.stringify(TEMPLATE, null, 2);
const FIELDS: Array<[string, string]> = [
  ["title", "Required. Up to 200 characters."],
  ["year", "Required. A whole number. A negative year means BCE."],
  ["isBce", "Optional. true for BCE, false for CE (default)."],
  ["month, day", "Optional. Month 1-12; a day needs a month and must exist in that month."],
  ["endYear, endIsBce, endMonth, endDay", "Optional. Makes the event a period drawn as a bracket. Must end on or after the start."],
  ["layer", "Optional. Layer name. Missing layers can be created during import."],
  ["color", "Optional. Card border colour as #rrggbb."],
  ["description", "Optional. Notes, up to 10,000 characters."],
];

export function JsonFormatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE_TEXT);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="JSON import format"
      description='A file can be a full chronicle ({ timeline, layers, events }) or a plain list of events ([ {...} ]).'
      icon={<FileJson className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={() => downloadBlob(new Blob([TEMPLATE_TEXT], { type: "application/json" }), "neeline-chronicle-template.json")}
          >
            Download template
          </Button>
        </>
      }
    >
      <dl className="grid gap-2 text-sm">
        {FIELDS.map(([name, text]) => (
          <div key={name} className="grid gap-1 sm:grid-cols-[14rem_1fr]">
            <dt><code className="rounded-sm bg-surface px-1.5 py-0.5 text-xs font-semibold text-accent">{name}</code></dt>
            <dd className="text-fg-muted">{text}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 overflow-hidden rounded-lg border border-line">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="text-xs font-medium text-fg-muted">neeline-chronicle-template.json</span>
          <Button size="sm" variant="ghost" icon={copyState === "copied" ? Check : Copy} onClick={copy} aria-live="polite">
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy blocked: select the text instead" : "Copy"}
          </Button>
        </div>
        <pre className="max-h-72 overflow-auto p-4 text-xs leading-relaxed text-fg"><code>{TEMPLATE_TEXT}</code></pre>
      </div>
    </Modal>
  );
}

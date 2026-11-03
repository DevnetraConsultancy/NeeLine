"use client";

import { useState } from "react";
import { CircleHelp, ExternalLink, Mail } from "lucide-react";
import { IconButton, Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { CONTACT_EMAIL, CREDIT_LINE, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

type HelpTab = "shortcuts" | "tools" | "about";

const SHORTCUTS: Array<[string, string]> = [
  ["Fit all events into view", "0"],
  ["Zoom in / out", "+  /  -   or scroll wheel"],
  ["Pan along the line", "Drag, or Left / Right arrow"],
  ["Move between events", "Tab, then Enter to edit"],
  ["Add an event", "N"],
  ["Show or hide canvas controls", "V"],
  ["Undo", "Ctrl+Z  (Cmd+Z on Mac)"],
  ["Redo", "Ctrl+Y  or  Ctrl+Shift+Z"],
  ["Close a dialog", "Esc"],
];

const GESTURES: Array<[string, string]> = [
  ["One-finger drag", "Pan"],
  ["Two-finger pinch", "Zoom"],
  ["Tap an event", "Edit it"],
];

const TOOLS: Array<[string, string]> = [
  ["Add event", "Adds a single date (a milestone) or a period with a start and end, shown as a bracket above the line."],
  ["Layers", "Group events into layers such as Bronze Age or Classical Rome. Each layer has its own colour; show, hide or isolate layers to compare them."],
  ["Even / Proportional", "Even gives every date the same spacing for readability. Proportional places dates at their true distance in time and lets you zoom down to individual days."],
  ["Gaps", "Shows the number of years between neighbouring events. Crossing from BCE to CE counts no year 0, so 10 BCE to 10 CE is 19 years."],
  ["Timeline settings", "Edit the timeline description and choose canvas colours, or let the canvas follow the light/dark theme."],
  ["Import and export", "Import events from a JSON file, export layers as JSON, the visible chart as a 2x PNG, or every event as tab-separated TXT."],
];

export function HelpDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("shortcuts");

  return (
    <>
      <IconButton icon={CircleHelp} label="Help and keyboard shortcuts" onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="NeeLine guide"
        description="History on a number line"
        size="md"
        footer={<Button variant="primary" onClick={() => setOpen(false)}>Got it</Button>}
      >
        <Tabs<HelpTab>
          label="Guide sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: "shortcuts", label: "Shortcuts" },
            { value: "tools", label: "Tools" },
            { value: "about", label: "About" },
          ]}
        />
        <TabPanel className="mt-5">
          {tab === "shortcuts" && (
            <div className="grid gap-6">
              <ShortcutList title="Keyboard and mouse" rows={SHORTCUTS} />
              <ShortcutList title="Touch" rows={GESTURES} />
            </div>
          )}
          {tab === "tools" && (
            <dl className="grid gap-4">
              {TOOLS.map(([name, text]) => (
                <div key={name}>
                  <dt className="text-sm font-semibold text-fg">{name}</dt>
                  <dd className="mt-1 text-sm text-fg-muted">{text}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === "about" && (
            <div className="grid gap-4 text-sm">
              <p className="font-semibold text-fg">{CREDIT_LINE}</p>
              <p className="text-fg-muted">
                NeeLine is built to bridge historical teaching, research chronicles and curiosity about time on an
                interactive number line.
              </p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                <Mail className="size-4" aria-hidden />
                {CONTACT_EMAIL}
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent hover:underline">
                <ExternalLink className="size-4" aria-hidden />
                {INSTAGRAM_HANDLE} on Instagram
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          )}
        </TabPanel>
      </Modal>
    </>
  );
}

function ShortcutList({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      <dl className="divide-y divide-line rounded-lg border border-line">
        {rows.map(([action, keys]) => (
          <div key={action} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-fg">{action}</dt>
            <dd>
              <kbd className="whitespace-pre rounded-sm border border-line bg-surface px-2 py-0.5 text-xs font-medium text-fg-muted">{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

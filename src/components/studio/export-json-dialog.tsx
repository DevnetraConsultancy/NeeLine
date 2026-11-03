"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { downloadBlob } from "@/lib/client/export";
import { buildExport, exportFileName } from "@/lib/domain/export-json";
import type { TimelineEvent } from "@/lib/domain/events";
import type { Layer, TimelineDetail } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  timeline: TimelineDetail;
  layers: Layer[];
  events: TimelineEvent[];
}

/** One JSON file per selected layer, in the same format the importer reads. */
export function ExportJsonDialog({ open, onClose, timeline, layers, events }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(layers.map((l) => l.id)));
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.layerId, (counts.get(e.layerId) ?? 0) + 1);
  const allSelected = selected.size === layers.length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportFiles = async () => {
    const chosen = layers.filter((l) => selected.has(l.id));
    for (const [index, layer] of chosen.entries()) {
      // Browsers block bursts of downloads; space them out slightly.
      if (index > 0) await new Promise((r) => setTimeout(r, 250));
      const payload = buildExport(timeline, [layer], events.filter((e) => e.layerId === layer.id), new Date());
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), exportFileName(timeline.name, layer.name));
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export layers as JSON"
      description="Each layer is saved as its own file, named Timeline_Layer.json. Files can be imported back into any timeline."
      icon={<Download className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Download} disabled={selected.size === 0} onClick={exportFiles}>
            {selected.size === 1 ? "Export 1 file" : `Export ${selected.size} files`}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setSelected(allSelected ? new Set() : new Set(layers.map((l) => l.id)))}>
          {allSelected ? "Select none" : "Select all"}
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {layers.map((layer) => {
          const count = counts.get(layer.id) ?? 0;
          return (
            <li key={layer.id}>
              <label className="flex items-center gap-3 p-3">
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={selected.has(layer.id)} onChange={() => toggle(layer.id)} />
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{layer.name}</span>
                  <span className="block truncate text-xs text-fg-muted">{exportFileName(timeline.name, layer.name)}</span>
                </span>
                <span className="text-xs tabular-nums text-fg-muted">{count} {count === 1 ? "event" : "events"}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

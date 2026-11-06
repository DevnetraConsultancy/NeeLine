"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { ColorPicker } from "@/components/ui/color-picker";
import { errorMessage } from "@/lib/client/api";
import { pickLayerColor } from "@/lib/domain/colors";
import { LIMITS } from "@/lib/validation/limits";
import type { TimelineEvent } from "@/lib/domain/events";
import type { Layer } from "@/types/api";
import type { Studio } from "@/components/studio/use-studio";

interface LayersDialogProps {
  open: boolean;
  onClose: () => void;
  layers: Layer[];
  events: TimelineEvent[];
  studio: Pick<Studio, "createLayer" | "updateLayer" | "setVisibleLayers" | "reorderLayers" | "deleteLayer">;
  onDeleted: (message: string) => void;
}

export function LayersDialog({ open, onClose, layers, events, studio, onDeleted }: LayersDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => pickLayerColor(layers.map((l) => l.color)));
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [recolouring, setRecolouring] = useState<string | null>(null);
  const [pickingNewColor, setPickingNewColor] = useState(false);
  const [deleting, setDeleting] = useState<Layer | null>(null);

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.layerId, (counts.get(e.layerId) ?? 0) + 1);
  const usedColors = layers.map((l) => l.color);
  const visibleIds = layers.filter((l) => l.visible).map((l) => l.id);

  const create = async () => {
    if (!name.trim()) {
      setCreateError("Enter a layer name.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const layer = await studio.createLayer(name.trim(), color);
      setName("");
      setColor(pickLayerColor([...usedColors, layer.color]));
    } catch (e) {
      setCreateError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const run = async (work: () => Promise<unknown>) => {
    setRowError(null);
    try {
      await work();
      return true;
    } catch (e) {
      setRowError(errorMessage(e));
      return false;
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = layers.map((l) => l.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    void studio.reorderLayers(ids);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Layers"
        description="A layer's colour is used for its cards, stems and brackets."
        icon={<Layers className="size-5" aria-hidden />}
        size="md"
        footer={<Button variant="primary" size="sm" onClick={onClose}>Done</Button>}
      >
        <section aria-label="New layer" className="grid gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Choose colour for the new layer"
              aria-expanded={pickingNewColor}
              title="Colour"
              onClick={() => setPickingNewColor((v) => !v)}
              className="size-7 shrink-0 rounded-full border-2 border-line-strong outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              style={{ backgroundColor: color }}
            />
            <Input
              aria-label="New layer name"
              aria-invalid={createError ? true : undefined}
              className="h-8"
              value={name}
              maxLength={LIMITS.layerName}
              placeholder="New layer name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void create();
                }
              }}
            />
            <Button variant="primary" size="sm" icon={Plus} loading={creating} onClick={create}>Add</Button>
          </div>
          {pickingNewColor && (
            <ColorPicker
              compact
              className="pl-9"
              label="Colour for the new layer"
              value={color}
              usedColors={usedColors}
              onChange={(hex) => {
                setColor(hex);
                setPickingNewColor(false);
              }}
            />
          )}
          {createError && <p role="alert" className="pl-9 text-xs font-medium text-danger">{createError}</p>}
        </section>

        <section aria-labelledby="layer-list-heading" className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <h3 id="layer-list-heading" className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Your layers ({layers.length})
            </h3>
            <span className="flex gap-0.5">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => studio.setVisibleLayers(layers.map((l) => l.id))}>Show all</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => studio.setVisibleLayers([])}>Hide all</Button>
            </span>
          </div>
          {rowError && <p role="alert" className="mb-2 rounded-md bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger">{rowError}</p>}

          <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {layers.map((layer, index) => {
              const count = counts.get(layer.id) ?? 0;
              return (
                <li key={layer.id} className="px-1.5 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex flex-col">
                      <IconButton icon={ArrowUp} size="sm" label={`Move ${layer.name} up`} disabled={index === 0} onClick={() => move(index, -1)} className="!h-4 !w-6 [&>svg]:!size-3" />
                      <IconButton icon={ArrowDown} size="sm" label={`Move ${layer.name} down`} disabled={index === layers.length - 1} onClick={() => move(index, 1)} className="!h-4 !w-6 [&>svg]:!size-3" />
                    </span>
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-[var(--accent)]"
                      checked={layer.visible}
                      title={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                      aria-label={`Show ${layer.name} on the canvas`}
                      onChange={() =>
                        studio.setVisibleLayers(layer.visible ? visibleIds.filter((id) => id !== layer.id) : [...visibleIds, layer.id])
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Change colour of ${layer.name}`}
                      aria-pressed={recolouring === layer.id}
                      title="Change colour"
                      onClick={() => setRecolouring(recolouring === layer.id ? null : layer.id)}
                      className={cn(
                        "size-4 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                        recolouring === layer.id && "ring-2 ring-fg",
                      )}
                      style={{ backgroundColor: layer.color }}
                    />

                    {renaming?.id === layer.id ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-1"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (await run(() => studio.updateLayer(layer.id, { name: renaming.value.trim() }))) setRenaming(null);
                        }}
                      >
                        <Input
                          autoFocus
                          aria-label={`New name for ${layer.name}`}
                          className="h-7"
                          maxLength={LIMITS.layerName}
                          value={renaming.value}
                          onChange={(e) => setRenaming({ id: layer.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              setRenaming(null);
                            }
                          }}
                        />
                        <IconButton icon={Check} size="sm" label="Save name" type="submit" className="!size-7" />
                        <IconButton icon={X} size="sm" label="Cancel rename" onClick={() => setRenaming(null)} className="!size-7" />
                      </form>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-fg">{layer.name}</span>
                        {layer.isDefault && <span className="rounded-sm bg-surface-hover px-1 text-[10px] text-fg-muted">Default</span>}
                      </span>
                    )}

                    <span className="shrink-0 rounded-sm bg-surface px-1.5 text-xs tabular-nums text-fg-muted" title={`${count} ${count === 1 ? "event" : "events"}`}>
                      {count}
                    </span>
                    {!layer.isDefault && renaming?.id !== layer.id && (
                      <IconButton icon={Pencil} size="sm" label={`Rename ${layer.name}`} onClick={() => setRenaming({ id: layer.id, value: layer.name })} className="!size-7" />
                    )}
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="danger-ghost"
                      label={layer.isDefault ? "The General layer cannot be deleted" : `Delete ${layer.name}`}
                      disabled={layer.isDefault}
                      onClick={() => setDeleting(layer)}
                      className="!size-7"
                    />
                  </div>
                  {recolouring === layer.id && (
                    <ColorPicker
                      compact
                      className="pb-1.5 pl-[3.25rem] pt-1"
                      label={`Colour for ${layer.name}`}
                      value={layer.color}
                      usedColors={usedColors}
                      onChange={(hex) => {
                        void run(() => studio.updateLayer(layer.id, { color: hex }));
                        setRecolouring(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </Modal>

      {deleting && (
        <DeleteLayerDialog
          layer={deleting}
          count={counts.get(deleting.id) ?? 0}
          onClose={() => setDeleting(null)}
          onConfirm={async (mode) => {
            await studio.deleteLayer(deleting.id, mode);
            onDeleted(
              mode === "delete-events"
                ? `Layer "${deleting.name}" and its events were deleted.`
                : `Layer "${deleting.name}" was deleted. Its events moved to General.`,
            );
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function DeleteLayerDialog({
  layer, count, onClose, onConfirm,
}: {
  layer: Layer;
  count: number;
  onClose: () => void;
  onConfirm: (mode: "move-to-default" | "delete-events") => Promise<void>;
}) {
  const [busy, setBusy] = useState<null | "move-to-default" | "delete-events">(null);
  const [error, setError] = useState<string | null>(null);
  const choose = async (mode: "move-to-default" | "delete-events") => {
    setBusy(mode);
    setError(null);
    try {
      await onConfirm(mode);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };
  const events = `${count} ${count === 1 ? "event" : "events"}`;

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={`Delete layer "${layer.name}"?`}
      description={`This layer has ${events}.`}
      icon={<Trash2 className="size-5 text-danger" aria-hidden />}
      footer={<Button variant="ghost" onClick={onClose} disabled={busy !== null} autoFocus>Cancel</Button>}
    >
      <div className="grid gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => choose("move-to-default")}
          className="rounded-lg border border-line p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
        >
          <span className="block text-sm font-semibold text-fg">Delete layer, keep events (recommended)</span>
          <span className="mt-1 block text-sm text-fg-muted">Moves the {events} to the General layer. Nothing is lost.</span>
        </button>
        <button
          type="button"
          disabled={busy !== null || count === 0}
          onClick={() => choose("delete-events")}
          className="rounded-lg border border-line p-4 text-left transition-colors hover:border-danger hover:bg-danger-soft disabled:opacity-50"
        >
          <span className="block text-sm font-semibold text-danger">Delete layer and its {events}</span>
          <span className="mt-1 block text-sm text-fg-muted">The events are deleted permanently and cannot be undone.</span>
        </button>
        {busy && <p className="text-sm text-fg-muted" role="status">Deleting...</p>}
        {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

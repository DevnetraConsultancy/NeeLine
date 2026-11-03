"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { Check, Layers, Maximize2, MoveHorizontal, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { LayoutMode } from "@/lib/domain/layout";
import type { TimelineEvent } from "@/lib/domain/events";
import type { Layer } from "@/types/api";

interface HudProps {
  visible: boolean;
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  showGaps: boolean;
  onToggleGaps: () => void;
  layers: Layer[];
  events: TimelineEvent[];
  onSetVisibleLayers: (ids: string[]) => void;
  onManageLayers: () => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  cursorLabelRef: Ref<HTMLSpanElement>;
  /** Studio toolbar element that hosts the view controls, so they never cover events. */
  toolbarSlot: HTMLElement | null;
}

/**
 * View controls (spacing, gaps, layers) live in the studio toolbar; zoom and
 * the position readout float in the canvas corners and hide in zen view.
 */
export function CanvasHud(props: HudProps) {
  const { visible, mode, onModeChange, showGaps, onToggleGaps, zoomPercent, onZoomIn, onZoomOut, onFit, cursorLabelRef, toolbarSlot } = props;
  const hiddenClass = visible ? "opacity-100" : "pointer-events-none opacity-0";

  const viewControls = (
    <div className="flex items-center gap-1">
      <Segmented<LayoutMode>
        label="Spacing"
        size="sm"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "even", label: "Even" },
          { value: "proportional", label: "Proportional" },
        ]}
      />
      <Button
        size="sm"
        variant="ghost"
        icon={MoveHorizontal}
        aria-pressed={showGaps}
        aria-label="Show year gaps"
        title="Show year gaps between events"
        onClick={onToggleGaps}
        className={cn("px-2", showGaps && "bg-accent-soft text-accent hover:text-accent")}
      >
        <span className="hidden md:inline">Gaps</span>
      </Button>
      <LayersPopover {...props} />
    </div>
  );

  return (
    <>
      {toolbarSlot && createPortal(viewControls, toolbarSlot)}

      <div className={cn("glass glass-blur absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-lg p-0.5 transition-opacity duration-200", hiddenClass)} inert={!visible}>
        <IconButton icon={ZoomOut} label="Zoom out (-)" size="sm" onClick={onZoomOut} />
        <IconButton icon={ZoomIn} label="Zoom in (+)" size="sm" onClick={onZoomIn} />
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Button size="sm" variant="ghost" icon={Maximize2} onClick={onFit} className="text-accent">
          Fit
        </Button>
      </div>

      <div
        className={cn("glass glass-blur pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-3 rounded-md px-2 py-1 text-xs font-medium tabular-nums text-fg-muted transition-opacity duration-200", hiddenClass)}
        aria-hidden
      >
        <span>Zoom {zoomPercent.toLocaleString("en-US")}%</span>
        <span ref={cursorLabelRef} className="text-accent empty:hidden" />
      </div>
    </>
  );
}

function LayersPopover({ layers, events, onSetVisibleLayers, onManageLayers }: HudProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const visibleIds = layers.filter((l) => l.visible).map((l) => l.id);
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.layerId, (counts.get(e.layerId) ?? 0) + 1);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (id: string) =>
    onSetVisibleLayers(visibleIds.includes(id) ? visibleIds.filter((v) => v !== id) : [...visibleIds, id]);

  return (
    <div ref={rootRef} className="relative">
      <Button size="sm" variant="ghost" icon={Layers} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className="px-2">
        <span className="sr-only md:not-sr-only">Layers </span>
        <span className="rounded-full bg-surface-hover px-1.5 text-xs tabular-nums">
          {visibleIds.length}/{layers.length}
        </span>
      </Button>
      {open && (
        <div id={panelId} role="dialog" aria-label="Layer visibility" className="glass-strong absolute right-0 top-full z-30 mt-2 w-72 animate-pop-in rounded-lg p-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-sm font-semibold text-fg">Show layers</span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onSetVisibleLayers(layers.map((l) => l.id))}>All</Button>
              <Button size="sm" variant="ghost" onClick={() => onSetVisibleLayers([])}>None</Button>
            </span>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {layers.map((layer) => (
              <li key={layer.id} className="group flex items-center gap-1 rounded-md hover:bg-surface-hover">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-sm">
                  <input type="checkbox" className="peer sr-only" checked={layer.visible} onChange={() => toggle(layer.id)} />
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-sm border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                    style={{ borderColor: layer.color, backgroundColor: layer.visible ? layer.color : "transparent" }}
                  >
                    {layer.visible && <Check className="size-3.5 text-[#070c16]" strokeWidth={3} />}
                  </span>
                  <span className={cn("truncate", layer.visible ? "text-fg" : "text-fg-muted")}>{layer.name}</span>
                  <span className="ml-auto rounded-sm bg-surface px-1.5 text-xs tabular-nums text-fg-muted">{counts.get(layer.id) ?? 0}</span>
                </label>
                <button
                  type="button"
                  onClick={() => onSetVisibleLayers([layer.id])}
                  className="mr-1 rounded-sm px-2 py-1 text-xs font-medium text-accent opacity-100 hover:bg-accent-soft sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                  aria-label={`Show only ${layer.name}`}
                >
                  Only
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <Button
              size="sm"
              variant="ghost"
              icon={SlidersHorizontal}
              className="w-full text-accent"
              onClick={() => {
                setOpen(false);
                onManageLayers();
              }}
            >
              Manage layers
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

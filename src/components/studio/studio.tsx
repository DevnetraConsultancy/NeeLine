"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle, ArrowLeft, Check, CircleDashed, Eye, EyeOff, FileJson, FileText, ImageDown, Layers, Loader2, MoreHorizontal,
  Plus, Redo2, Settings2, Undo2, Upload,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { useTheme } from "@/components/layout/theme";
import { Button, IconButton } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { TimelineCanvas, type CanvasColors, type CanvasHandle } from "@/components/studio/canvas";
import { migrateLegacyPrefs } from "@/components/studio/legacy-prefs";
import { useStudio, type SaveState } from "@/components/studio/use-studio";
import { downloadBlob, eventsToTxt, slugify } from "@/lib/client/export";
import { errorMessage } from "@/lib/client/api";
import { LIMITS } from "@/lib/validation/limits";
import type { TimelineEvent } from "@/lib/domain/events";

// Dialogs load on first use, keeping them (and zod) out of the studio's first download.
const EventFormDialog = dynamic(() => import("@/components/studio/event-form-dialog").then((m) => m.EventFormDialog), { ssr: false });
const LayersDialog = dynamic(() => import("@/components/studio/layers-dialog").then((m) => m.LayersDialog), { ssr: false });
const TimelineSettingsDialog = dynamic(() => import("@/components/studio/timeline-settings-dialog").then((m) => m.TimelineSettingsDialog), { ssr: false });
const ImportDialog = dynamic(() => import("@/components/studio/import-dialog").then((m) => m.ImportDialog), { ssr: false });
const ExportJsonDialog = dynamic(() => import("@/components/studio/export-json-dialog").then((m) => m.ExportJsonDialog), { ssr: false });
const JsonFormatDialog = dynamic(() => import("@/components/studio/json-format-dialog").then((m) => m.JsonFormatDialog), { ssr: false });

const THEME_CANVAS: Record<"dark" | "light", CanvasColors & { zero: string }> = {
  dark: { bg: "#070c16", spine: "#c9a84c", text: "#f5f0e8", zero: "#ef4444" },
  light: { bg: "#faf8f5", spine: "#7d5e10", text: "#0f172a", zero: "#dc2626" },
};

type Dialog = "event" | "layers" | "settings" | "import" | "export" | "format" | null;

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v !== "false";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Preference is kept for this visit only.
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function Studio({ timelineId }: { timelineId: string }) {
  const studio = useStudio(timelineId);
  const { data, loadError, reload, saveState, history } = studio;
  const { theme } = useTheme();
  const toast = useToast();
  const canvasRef = useRef<CanvasHandle>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showGapBorder, setShowGapBorder] = useState(true);
  const migrated = useRef(false);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setShowControls(readFlag("neeline_canvas_controls", true));
    setShowGapBorder(readFlag("neeline_gap_border", true));
  }, []);

  useEffect(() => {
    if (data) document.title = `${data.timeline.name} · NeeLine`;
  }, [data]);

  useEffect(() => {
    if (!data || migrated.current) return;
    migrated.current = true;
    migrateLegacyPrefs(timelineId, data, studio)
      .then((applied) => applied && toast.success("Moved your layer settings from this browser into your account."))
      .catch((error) => toast.error("Some saved layer settings could not be moved", { description: errorMessage(error) }));
  }, [data, studio, timelineId, toast]);

  const openEvent = (event: TimelineEvent | null) => {
    setEditing(event);
    setFormKey((k) => k + 1);
    setDialog("event");
  };

  const toggleControls = () => {
    setShowControls((v) => {
      writeFlag("neeline_canvas_controls", !v);
      return !v;
    });
  };

  // Global shortcuts. Ignored while typing or while any dialog is open.
  const shortcuts = useRef<(e: KeyboardEvent) => void>(() => undefined);
  shortcuts.current = (e: KeyboardEvent) => {
    if (!data || isTyping(e.target) || document.querySelector("dialog[open], [role='dialog']")) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && !e.altKey) {
      if (key === "z" && !e.shiftKey) void studio.undo();
      else if (key === "y" || (key === "z" && e.shiftKey)) void studio.redo();
      else return;
      e.preventDefault();
      return;
    }
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    if (key === "n") openEvent(null);
    else if (key === "v") toggleControls();
    else if (key === "0") canvasRef.current?.fit();
    else if (key === "+" || key === "=") canvasRef.current?.zoomBy(1.25);
    else if (key === "-") canvasRef.current?.zoomBy(1 / 1.25);
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => shortcuts.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loadError) {
    const notFound = loadError.status === 404;
    const trashed = loadError.status === 409;
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <main id="main" className="mx-auto max-w-xl px-4 py-16">
          <ErrorState
            title={notFound ? "Timeline not found" : trashed ? "This timeline is in the trash" : "The timeline could not be loaded"}
            description={notFound ? "It may have been deleted, or it belongs to another account." : trashed ? "Restore it from the Trash tab on your dashboard to open it." : loadError.message}
            action={
              <div className="flex gap-2">
                <Link href="/dashboard" className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-fg hover:bg-surface-hover">Back to dashboard</Link>
                {!notFound && !trashed && <Button variant="primary" onClick={() => reload()}>Try again</Button>}
              </div>
            }
          />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-dvh flex-col">
        <AppHeader />
        <main id="main" className="flex flex-1 flex-col gap-3 p-4" aria-busy="true">
          <span className="sr-only" role="status">Loading timeline</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="flex-1 w-full" />
        </main>
      </div>
    );
  }

  const { timeline, layers, events } = data;
  const defaultLayerId = layers.find((l) => l.isDefault)?.id ?? layers[0]?.id ?? "";
  const themeColors = THEME_CANVAS[theme];
  const colors: CanvasColors = timeline.colors.bg
    ? { bg: timeline.colors.bg, spine: timeline.colors.spine ?? themeColors.spine, text: timeline.colors.text ?? themeColors.text }
    : themeColors;
  const undoAction = history.undo.at(-1);
  const redoAction = history.redo.at(-1);

  const exportPng = async () => {
    try {
      await canvasRef.current?.exportPng(`${slugify(timeline.name)}-visible-layers.png`);
    } catch (error) {
      toast.error("PNG export failed", { description: errorMessage(error) });
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader wide />
      <div className="glass glass-blur z-30 rounded-none border-x-0 border-t-0">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-2 py-1 sm:px-3">
          <Link href="/dashboard" aria-label="Back to dashboard" className="flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-hover hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <TimelineName name={timeline.name} onRename={(name) => studio.updateTimeline({ name }, true)} />
          <span className="hidden text-xs tabular-nums text-fg-muted md:inline">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
          <SaveIndicator state={saveState} />
          {/* View controls from the canvas are rendered here; on phones they take their own row. */}
          <div ref={setToolbarSlot} className="order-last flex w-full justify-center sm:order-none sm:ml-2 sm:w-auto sm:justify-start" />

          <div className="ml-auto flex items-center gap-0.5">
            <IconButton icon={Undo2} size="sm" label={undoAction ? `Undo: ${undoAction.label} (Ctrl+Z)` : "Nothing to undo"} disabled={!undoAction} onClick={() => void studio.undo()} />
            <IconButton icon={Redo2} size="sm" label={redoAction ? `Redo: ${redoAction.label} (Ctrl+Y)` : "Nothing to redo"} disabled={!redoAction} onClick={() => void studio.redo()} />
            <Menu
              label="More actions"
              items={[
                { label: "Import JSON...", icon: Upload, onSelect: () => setDialog("import") },
                { label: "Export layers as JSON...", icon: FileJson, onSelect: () => setDialog("export") },
                { label: "Export PNG (visible layers)", icon: ImageDown, onSelect: () => void exportPng() },
                {
                  label: "Export TXT",
                  icon: FileText,
                  onSelect: () => downloadBlob(new Blob([eventsToTxt(events, layers)], { type: "text/plain;charset=utf-8" }), `${slugify(timeline.name)}-events.txt`),
                },
                { label: "JSON format and template", icon: FileJson, onSelect: () => setDialog("format") },
                "separator",
                { label: "Manage layers", icon: Layers, onSelect: () => setDialog("layers") },
                { label: "Timeline settings", icon: Settings2, onSelect: () => setDialog("settings") },
                { label: showControls ? "Hide zoom controls (V)" : "Show zoom controls (V)", icon: showControls ? EyeOff : Eye, onSelect: toggleControls },
              ]}
              trigger={(props) => <IconButton {...props} icon={MoreHorizontal} size="sm" label="More actions" />}
            />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => openEvent(null)} className="ml-1" aria-label="Add event (N)">
              <span className="hidden sm:inline">Add event</span>
            </Button>
          </div>
        </div>
      </div>

      <main id="main" className="relative min-h-0 flex-1">
        <h1 className="sr-only">{timeline.name}</h1>
        <TimelineCanvas
          ref={canvasRef}
          timelineId={timelineId}
          events={events}
          layers={layers}
          colors={colors}
          zeroColor={timeline.colors.bg ? "#ef4444" : themeColors.zero}
          showControls={showControls}
          showGapBorder={showGapBorder}
          onEditEvent={openEvent}
          onSetVisibleLayers={(ids) => void studio.setVisibleLayers(ids)}
          onManageLayers={() => setDialog("layers")}
          toolbarSlot={toolbarSlot}
        />
      </main>

      {dialog === "event" && (
        <EventFormDialog
          key={formKey}
          open
          event={editing}
          layers={layers}
          events={events}
          defaultLayerId={editing?.layerId ?? layers.find((l) => l.visible)?.id ?? defaultLayerId}
          onSave={(fields) => (editing ? studio.updateEvent(editing.id, fields) : studio.createEvent(fields))}
          onDelete={studio.deleteEvent}
          onCreateLayer={studio.createLayer}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "layers" && (
        <LayersDialog open onClose={() => setDialog(null)} layers={layers} events={events} studio={studio} onDeleted={(m) => toast.success(m)} />
      )}
      {dialog === "settings" && (
        <TimelineSettingsDialog
          open
          onClose={() => setDialog(null)}
          timeline={timeline}
          events={events}
          layers={layers}
          themeColors={themeColors}
          showGapBorder={showGapBorder}
          onShowGapBorderChange={(v) => {
            setShowGapBorder(v);
            writeFlag("neeline_gap_border", v);
          }}
          onSave={(patch) => studio.updateTimeline(patch)}
        />
      )}
      {dialog === "import" && (
        <ImportDialog
          open
          onClose={() => setDialog(null)}
          timelineId={timelineId}
          layers={layers}
          defaultLayerId={defaultLayerId}
          onImported={(result) => {
            studio.applyImport(result);
            const skipped = result.skippedDuplicates > 0 ? ` Skipped ${result.skippedDuplicates} exact duplicates.` : "";
            toast.success(`Imported ${result.created.length} ${result.created.length === 1 ? "event" : "events"}.${skipped}`);
          }}
        />
      )}
      {dialog === "export" && <ExportJsonDialog open onClose={() => setDialog(null)} timeline={timeline} layers={layers} events={events} />}
      {dialog === "format" && <JsonFormatDialog open onClose={() => setDialog(null)} />}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const content = {
    saved: { icon: Check, text: "All changes saved", className: "text-fg-muted" },
    saving: { icon: Loader2, text: "Saving...", className: "text-fg-muted [&>svg]:animate-spin" },
    error: { icon: AlertTriangle, text: "Last change was not saved", className: "text-danger" },
  }[state];
  const Icon = content.icon ?? CircleDashed;
  return (
    <span role="status" title={content.text} className={`inline-flex items-center gap-1.5 text-xs font-medium ${content.className}`}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only sm:not-sr-only">{content.text}</span>
    </span>
  );
}

function TimelineName({ name, onRename }: { name: string; onRename: (name: string) => Promise<unknown> }) {
  const [value, setValue] = useState<string | null>(null);
  const toast = useToast();

  const save = async () => {
    if (value === null) return;
    const next = value.trim();
    setValue(null);
    if (!next || next === name) return;
    try {
      await onRename(next);
    } catch (error) {
      toast.error("Could not rename the timeline", { description: errorMessage(error) });
    }
  };

  if (value !== null) {
    return (
      <input
        autoFocus
        aria-label="Timeline name"
        className="h-8 min-w-0 max-w-xs flex-1 rounded-md border border-accent bg-surface px-2 text-sm font-semibold text-fg outline-none"
        value={value}
        maxLength={LIMITS.timelineName}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setValue(null);
        }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setValue(name)}
      title="Rename timeline"
      className="min-w-0 max-w-[40vw] truncate rounded-md px-1.5 py-0.5 text-left text-sm font-semibold text-fg hover:bg-surface-hover"
    >
      {name}
    </button>
  );
}

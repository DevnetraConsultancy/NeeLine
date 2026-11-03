"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, FileJson, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { api, errorMessage } from "@/lib/client/api";
import { ImportFileError, parseImportFile, type ParsedImport } from "@/lib/domain/import";
import { layerNameKey } from "@/lib/domain/layers";
import { LIMITS } from "@/lib/validation/schemas";
import type { ImportResult, Layer } from "@/types/api";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  timelineId: string;
  layers: Layer[];
  defaultLayerId: string;
  onImported: (result: ImportResult) => void;
}

const MAX_ROW_ERRORS_SHOWN = 8;

export function ImportDialog({ open, onClose, timelineId, layers, defaultLayerId, onImported }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "preserve">("preserve");
  const [targetLayerId, setTargetLayerId] = useState(defaultLayerId);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setFileError(null);
    setSubmitError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const read = async (selected: File) => {
    reset();
    setFile({ name: selected.name, size: selected.size });
    if (selected.size > LIMITS.importFileBytes) {
      setFileError("The file is larger than 5 MB. Split it into smaller files.");
      return;
    }
    try {
      const result = parseImportFile(await selected.text());
      setParsed(result);
      if (result.events.length === 0) setFileError("None of the rows could be imported. See the problems below.");
    } catch (error) {
      setFileError(error instanceof ImportFileError ? error.message : "The file could not be read.");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) void read(dropped);
  };

  const existingKeys = new Set(layers.map((l) => layerNameKey(l.name)));
  const newLayerNames = parsed
    ? Array.from(new Set(parsed.events.map((e) => e.layerName?.trim()).filter((n): n is string => Boolean(n) && !existingKeys.has(layerNameKey(n!)))))
    : [];
  const periods = parsed?.events.filter((e) => e.endYear !== null).length ?? 0;

  const submit = async () => {
    if (!parsed || parsed.events.length === 0) return;
    setImporting(true);
    setSubmitError(null);
    try {
      const result = await api.post<ImportResult>("/api/events/import", {
        timelineId,
        mode,
        targetLayerId,
        layers: parsed.layers,
        events: parsed.events,
      });
      onImported(result);
      close();
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!importing}
      title="Import events from JSON"
      description="Accepts a NeeLine export or a plain list of events. Exact duplicates of existing events are skipped."
      icon={<Upload className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={importing}>Cancel</Button>
          <Button variant="primary" loading={importing} disabled={!parsed || parsed.events.length === 0} onClick={submit}>
            {parsed && parsed.events.length > 0 ? `Import ${parsed.events.length.toLocaleString("en-US")} events` : "Import"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-6 py-8 text-center transition-colors hover:border-accent",
            dragging && "border-accent bg-accent-soft",
          )}
        >
          <FileJson className="size-8 text-accent" aria-hidden />
          <span className="text-sm font-medium text-fg">{file ? file.name : "Drop a .json file here, or click to choose one"}</span>
          <span className="text-xs text-fg-muted">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : `Up to ${LIMITS.importEvents.toLocaleString("en-US")} events and 5 MB`}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) void read(selected);
            }}
          />
        </label>

        {fileError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{fileError}</p>}

        {parsed && parsed.events.length > 0 && (
          <dl className="grid grid-cols-3 gap-3">
            {[["Events", parsed.events.length], ["Single dates", parsed.events.length - periods], ["Periods", periods]].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line p-3">
                <dt className="text-xs text-fg-muted">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{Number(value).toLocaleString("en-US")}</dd>
              </div>
            ))}
          </dl>
        )}

        {parsed && parsed.rowErrors.length > 0 && (
          <div className="rounded-lg border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <AlertTriangle className="size-4 text-danger" aria-hidden />
              {parsed.rowErrors.length} {parsed.rowErrors.length === 1 ? "row" : "rows"} will be skipped
            </p>
            <ul className="mt-2 grid gap-1 text-sm text-fg-muted">
              {parsed.rowErrors.slice(0, MAX_ROW_ERRORS_SHOWN).map((err) => <li key={err}>{err}</li>)}
              {parsed.rowErrors.length > MAX_ROW_ERRORS_SHOWN && <li>and {parsed.rowErrors.length - MAX_ROW_ERRORS_SHOWN} more</li>}
            </ul>
          </div>
        )}

        {parsed && parsed.events.length > 0 && (
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold text-fg">Which layer should the events go on?</legend>
            {(
              [
                ["preserve", "Use each event's own layer", newLayerNames.length > 0 ? `Creates ${newLayerNames.length} new ${newLayerNames.length === 1 ? "layer" : "layers"}: ${newLayerNames.slice(0, 4).join(", ")}${newLayerNames.length > 4 ? "..." : ""}. Events without a layer go to the layer below.` : "Events without a layer go to the layer below."],
                ["single", "Put every event on one layer", "Ignores the layers in the file."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className={cn("flex gap-3 rounded-lg border p-4 transition-colors", mode === value ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}>
                <input type="radio" name="import-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1 accent-[var(--accent)]" />
                <span>
                  <span className="block text-sm font-medium text-fg">{label}</span>
                  <span className="block text-sm text-fg-muted">{hint}</span>
                </span>
              </label>
            ))}
            <Field label={mode === "single" ? "Layer" : "Layer for events without one"}>
              {(p) => (
                <Select {...p} value={targetLayerId} onChange={(e) => setTargetLayerId(e.target.value)}>
                  {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              )}
            </Field>
          </fieldset>
        )}

        {submitError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{submitError}</p>}
      </div>
    </Modal>
  );
}

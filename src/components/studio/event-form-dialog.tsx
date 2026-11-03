"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { errorMessage } from "@/lib/client/api";
import { DEFAULT_EVENT_COLOR, pickLayerColor } from "@/lib/domain/colors";
import { formatDateLabel, formatSpanLabel, MONTH_NAMES, type HistoricalDate } from "@/lib/domain/dates";
import { startDate, type EventFields, type TimelineEvent } from "@/lib/domain/events";
import { eventFieldsSchema, LIMITS } from "@/lib/validation/schemas";
import type { Layer } from "@/types/api";

interface EventFormDialogProps {
  open: boolean;
  /** The event being edited, or null to add a new one. */
  event: TimelineEvent | null;
  layers: Layer[];
  events: TimelineEvent[];
  defaultLayerId: string;
  onSave: (fields: EventFields) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onCreateLayer: (name: string, color: string) => Promise<Layer>;
  onClose: () => void;
}

interface DateDraft {
  era: "BCE" | "CE";
  year: string;
  month: string;
  day: string;
}

type FieldErrors = Partial<Record<"title" | "notes" | "start" | "end" | "layer" | "form", string>>;

const blankDate: DateDraft = { era: "CE", year: "", month: "", day: "" };

function toDraft(year: number | null, isBce: boolean | null, month: number | null, day: number | null): DateDraft {
  if (year === null) return blankDate;
  return { era: isBce ? "BCE" : "CE", year: String(year), month: month ? String(month) : "", day: day ? String(day) : "" };
}

function parseDraft(d: DateDraft): HistoricalDate & { yearText: string } {
  const toInt = (s: string) => (s.trim() === "" ? null : Number(s));
  const rawYear = Number(d.year);
  // A negative year means BCE, as in the old form.
  const negative = Number.isFinite(rawYear) && rawYear < 0;
  return {
    yearText: d.year,
    year: Math.abs(rawYear),
    isBce: negative || d.era === "BCE",
    month: toInt(d.month),
    day: toInt(d.day),
  };
}

function errorField(path: PropertyKey | undefined): keyof FieldErrors {
  const key = String(path ?? "");
  if (key === "title" || key === "notes") return key;
  if (key.startsWith("end")) return "end";
  if (["year", "isBce", "month", "day"].includes(key)) return "start";
  if (key === "layerId") return "layer";
  return "form";
}

/**
 * Add or edit an event. Mounted with a key per event, so its values are set
 * once when it opens and never reset while the user is typing.
 */
export function EventFormDialog({ open, event, layers, events, defaultLayerId, onSave, onDelete, onCreateLayer, onClose }: EventFormDialogProps) {
  const editing = event !== null;
  const [kind, setKind] = useState<"point" | "period">(event?.endYear !== null && event ? "period" : "point");
  const [title, setTitle] = useState(event?.title ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [layerId, setLayerId] = useState(event?.layerId ?? defaultLayerId);
  const [color, setColor] = useState(event?.color ?? layers.find((l) => l.id === defaultLayerId)?.color ?? DEFAULT_EVENT_COLOR);
  const [start, setStart] = useState<DateDraft>(event ? toDraft(event.year, event.isBce, event.month, event.day) : blankDate);
  const [end, setEnd] = useState<DateDraft>(event ? toDraft(event.endYear, event.endIsBce, event.endMonth, event.endDay) : blankDate);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newLayer, setNewLayer] = useState<{ name: string; color: string } | null>(null);
  const [creatingLayer, setCreatingLayer] = useState(false);

  const otherEvents = useMemo(() => events.filter((e) => e.id !== event?.id), [events, event?.id]);
  const usedLayerColors = layers.map((l) => l.color);

  const buildFields = (): EventFields => {
    const s = parseDraft(start);
    const e = parseDraft(end);
    const period = kind === "period";
    return {
      title: title.trim(),
      notes: notes.trim() || null,
      year: start.year.trim() === "" ? Number.NaN : s.year,
      isBce: s.isBce,
      month: s.month,
      day: s.day,
      endYear: period ? (end.year.trim() === "" ? Number.NaN : e.year) : null,
      endIsBce: period ? e.isBce : null,
      endMonth: period ? e.month : null,
      endDay: period ? e.day : null,
      color,
      layerId,
    };
  };

  const preview = (() => {
    const s = parseDraft(start);
    if (start.year.trim() === "" || !Number.isFinite(s.year)) return null;
    if (kind === "point") return formatDateLabel(s);
    const e = parseDraft(end);
    return end.year.trim() === "" || !Number.isFinite(e.year) ? null : formatSpanLabel(s, e);
  })();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fields = buildFields();
    const parsed = eventFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = errorField(issue.path[0]);
        next[key] ??= key === "start" && issue.path[0] === "year" && start.year.trim() === "" ? "Enter a year." : key === "end" && issue.path[0] === "endYear" && end.year.trim() === "" ? "Enter an end year for the period." : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave({ ...parsed.data, notes: parsed.data.notes ?? null });
      onClose();
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const addLayer = async () => {
    if (!newLayer) return;
    const name = newLayer.name.trim();
    if (!name) {
      setErrors((x) => ({ ...x, layer: "Enter a name for the new layer." }));
      return;
    }
    setCreatingLayer(true);
    try {
      const layer = await onCreateLayer(name, newLayer.color);
      setLayerId(layer.id);
      setColor(layer.color);
      setNewLayer(null);
      setErrors((x) => ({ ...x, layer: undefined }));
    } catch (error) {
      setErrors((x) => ({ ...x, layer: errorMessage(error) }));
    } finally {
      setCreatingLayer(false);
    }
  };

  const copyDateFrom = (id: string, target: "start" | "end") => {
    const source = otherEvents.find((e) => e.id === id);
    if (!source) return;
    const draft = toDraft(source.year, source.isBce, source.month, source.day);
    if (target === "start") setStart(draft);
    else setEnd(draft);
  };

  const noun = kind === "period" ? "period" : "milestone";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        dismissible={!saving}
        size="md"
        icon={<CalendarPlus className="size-5" aria-hidden />}
        title={editing ? `Edit ${noun}` : `Add ${noun}`}
        description={kind === "period" ? "A span of time, drawn as a bracket above the line." : "A single date on the number line."}
        footer={
          <>
            {editing && (
              <Button variant="ghost" icon={Trash2} className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" form="event-form" loading={saving}>
              {editing ? "Save changes" : `Add ${noun}`}
            </Button>
          </>
        }
      >
        <form id="event-form" className="grid gap-5" onSubmit={submit} noValidate>
          {errors.form && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {errors.form} Your changes are still here.
            </p>
          )}

          <Segmented
            label="Event type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "point", label: "Single date" },
              { value: "period", label: "Period" },
            ]}
          />

          <Field label={kind === "period" ? "Period name" : "Title"} required error={errors.title}>
            {(p) => (
              <Input
                {...p}
                autoFocus
                value={title}
                maxLength={LIMITS.eventTitle}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "period" ? "e.g. Roman Republic, Bronze Age" : "e.g. Magna Carta, Council of Nicaea"}
              />
            )}
          </Field>

          <DateFields
            legend={kind === "period" ? "Start" : "Date"}
            value={start}
            onChange={setStart}
            error={errors.start}
            copyOptions={kind === "period" ? otherEvents : []}
            onCopy={(id) => copyDateFrom(id, "start")}
          />
          {kind === "period" && (
            <DateFields legend="End" value={end} onChange={setEnd} error={errors.end} copyOptions={otherEvents} onCopy={(id) => copyDateFrom(id, "end")} />
          )}
          {preview && (
            <p className="-mt-2 text-sm text-fg-muted" aria-live="polite">
              Shown as <span className="font-semibold text-accent">{preview}</span>
            </p>
          )}

          <div className="grid gap-3">
            <Field label="Layer" error={newLayer ? undefined : errors.layer}>
              {(p) => (
                <div className="flex gap-2">
                  <Select
                    {...p}
                    value={layerId}
                    onChange={(e) => {
                      setLayerId(e.target.value);
                      const layer = layers.find((l) => l.id === e.target.value);
                      if (layer) setColor(layer.color);
                    }}
                  >
                    {layers.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </Select>
                  <Button
                    icon={Plus}
                    onClick={() => setNewLayer(newLayer ? null : { name: "", color: pickLayerColor(usedLayerColors) })}
                    aria-expanded={newLayer !== null}
                  >
                    {newLayer ? "Cancel" : "New layer"}
                  </Button>
                </div>
              )}
            </Field>
            {newLayer && (
              <div className="grid gap-3 rounded-lg border border-line p-4">
                <Field label="New layer name" error={errors.layer}>
                  {(p) => (
                    <Input
                      {...p}
                      autoFocus
                      maxLength={LIMITS.layerName}
                      value={newLayer.name}
                      placeholder="e.g. Bronze Age, Classical Rome"
                      onChange={(e) => setNewLayer({ ...newLayer, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addLayer();
                        }
                      }}
                    />
                  )}
                </Field>
                <ColorPicker label="Layer colour" value={newLayer.color} usedColors={usedLayerColors} onChange={(hex) => setNewLayer({ ...newLayer, color: hex })} />
                <div>
                  <Button variant="primary" size="sm" loading={creatingLayer} onClick={addLayer}>Create layer</Button>
                </div>
              </div>
            )}
          </div>

          <Field label="Notes" hint={`${notes.length.toLocaleString("en-US")} / ${LIMITS.eventNotes.toLocaleString("en-US")} characters. Shown when you hover or focus the event.`} error={errors.notes}>
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                maxLength={LIMITS.eventNotes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context, sources, citations or scope"
              />
            )}
          </Field>

          <ColorPicker label="Card border colour" value={color} onChange={setColor} />
        </form>
      </Modal>

      {event && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete this ${noun}?`}
          message={<>&ldquo;{event.title}&rdquo; will be removed from the timeline. You can undo this with Ctrl+Z.</>}
          confirmLabel={`Delete ${noun}`}
          cancelLabel={`Keep ${noun}`}
          onConfirm={async () => {
            await onDelete(event.id);
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

function DateFields({
  legend, value, onChange, error, copyOptions, onCopy,
}: {
  legend: string;
  value: DateDraft;
  onChange: (d: DateDraft) => void;
  error?: string;
  copyOptions: TimelineEvent[];
  onCopy: (id: string) => void;
}) {
  const set = (patch: Partial<DateDraft>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="grid gap-3 rounded-lg border border-line p-4" aria-invalid={error ? true : undefined}>
      <legend className="px-1 text-sm font-medium text-fg">{legend}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <Segmented
          label={`${legend} era`}
          value={value.era}
          onChange={(era) => set({ era })}
          options={[
            { value: "BCE", label: "BCE" },
            { value: "CE", label: "CE" },
          ]}
        />
        <Field label="Year" required className="w-32">
          {(p) => <Input {...p} inputMode="numeric" value={value.year} onChange={(e) => set({ year: e.target.value })} placeholder="e.g. 509" />}
        </Field>
        <Field label="Month" className="w-36">
          {(p) => (
            <Select {...p} value={value.month} onChange={(e) => set({ month: e.target.value, day: e.target.value ? value.day : "" })}>
              <option value="">None</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Day" className="w-24">
          {(p) => <Input {...p} inputMode="numeric" value={value.day} disabled={!value.month} onChange={(e) => set({ day: e.target.value })} placeholder="-" />}
        </Field>
      </div>
      {copyOptions.length > 0 && (
        <Field label={`Copy ${legend.toLowerCase()} date from another event`}>
          {(p) => (
            <Select {...p} value="" onChange={(e) => onCopy(e.target.value)}>
              <option value="">Choose an event</option>
              {copyOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.title} ({formatDateLabel(startDate(e))})</option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

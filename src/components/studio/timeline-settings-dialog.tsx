"use client";

import { useState, type FormEvent } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Switch, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/client/api";
import { contrastRatio } from "@/lib/domain/colors";
import { compareDates, formatDateLabel, type HistoricalDate } from "@/lib/domain/dates";
import { endDate, startDate, type TimelineEvent } from "@/lib/domain/events";
import { LIMITS } from "@/lib/validation/schemas";
import type { Layer, TimelineDetail } from "@/types/api";
import type { CanvasColors } from "@/components/studio/canvas";

interface Props {
  open: boolean;
  onClose: () => void;
  timeline: TimelineDetail;
  events: TimelineEvent[];
  layers: Layer[];
  themeColors: CanvasColors;
  showGapBorder: boolean;
  onShowGapBorderChange: (show: boolean) => void;
  onSave: (patch: { description: string | null; bgColor: string | null; spineColor: string | null; tickColor: string | null; textColor: string | null }) => Promise<unknown>;
}

function range(events: TimelineEvent[]): string | null {
  const dates = events.flatMap((e) => [startDate(e), endDate(e)].filter((d): d is HistoricalDate => d !== null));
  if (dates.length === 0) return null;
  const sorted = [...dates].sort(compareDates);
  return `${formatDateLabel(sorted[0])} to ${formatDateLabel(sorted[sorted.length - 1])}`;
}

/** Timeline description, summary and canvas appearance. */
export function TimelineSettingsDialog({ open, onClose, timeline, events, layers, themeColors, showGapBorder, onShowGapBorderChange, onSave }: Props) {
  const [description, setDescription] = useState(timeline.description ?? "");
  const custom = timeline.colors.bg !== null;
  const [followTheme, setFollowTheme] = useState(!custom);
  const [bg, setBg] = useState(timeline.colors.bg ?? themeColors.bg);
  const [spine, setSpine] = useState(timeline.colors.spine ?? themeColors.spine);
  const [text, setText] = useState(timeline.colors.text ?? themeColors.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratio = contrastRatio(text, bg);
  const periods = events.filter((e) => e.endYear !== null).length;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        description: description.trim() || null,
        bgColor: followTheme ? null : bg,
        spineColor: followTheme ? null : spine,
        tickColor: followTheme ? null : spine,
        textColor: followTheme ? null : text,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title="Timeline settings"
      description={timeline.name}
      icon={<Settings2 className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form="timeline-settings" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="timeline-settings" className="grid gap-6" onSubmit={submit}>
        {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Events", String(events.length)],
            ["Periods", String(periods)],
            ["Layers", String(layers.length)],
            ["Range", range(events) ?? "No events"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line p-3">
              <dt className="text-xs text-fg-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <Field label="Description" hint="Scope, themes, sources. Shown on the dashboard card.">
          {(p) => (
            <Textarea {...p} rows={5} maxLength={LIMITS.timelineDescription} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Historical context, overarching themes or geographical boundaries" />
          )}
        </Field>

        <fieldset className="grid gap-4">
          <legend className="mb-2 text-sm font-semibold text-fg">Canvas appearance</legend>
          <Switch label="Follow the light/dark theme" description="Turn off to choose fixed canvas colours for this timeline." checked={followTheme} onChange={setFollowTheme} />
          {!followTheme && (
            <div className="grid gap-3 sm:grid-cols-3">
              <ColorInput label="Background" value={bg} onChange={setBg} />
              <ColorInput label="Number line" value={spine} onChange={setSpine} />
              <ColorInput label="Text" value={text} onChange={setText} />
              {ratio < 4.5 && (
                <p role="status" className="text-sm text-danger sm:col-span-3">
                  Text contrast is {ratio.toFixed(1)}:1. Some readers will struggle below 4.5:1.
                </p>
              )}
            </div>
          )}
          <Switch label="Border around gap badges" description="Outline the year-gap labels under the line." checked={showGapBorder} onChange={onShowGapBorderChange} />
        </fieldset>
      </form>
    </Modal>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <Field label={label}>
      {(p) => (
        <span className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-2">
          <input {...p} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-sm border-0 bg-transparent p-0" />
          <span className="text-sm tabular-nums text-fg-muted">{value}</span>
        </span>
      )}
    </Field>
  );
}

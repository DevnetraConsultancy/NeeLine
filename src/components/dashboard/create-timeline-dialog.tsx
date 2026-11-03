"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api, errorMessage } from "@/lib/client/api";
import { LIMITS } from "@/lib/validation/limits";
import type { TimelineSummary } from "@/types/api";

export function CreateTimelineDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (t: TimelineSummary) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Enter a name for the timeline.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onCreated(await api.post<TimelineSummary>("/api/timelines", { name: name.trim(), description: description.trim() || null }));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      title="New timeline"
      description="You can add layers and events once the studio opens."
      icon={<Plus className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-timeline" loading={saving}>Create timeline</Button>
        </>
      }
    >
      <form id="create-timeline" className="grid gap-5" onSubmit={submit} noValidate>
        {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
        <Field label="Name" required error={nameError}>
          {(p) => (
            <Input
              {...p}
              autoFocus
              maxLength={LIMITS.timelineName}
              value={name}
              placeholder="e.g. Rise of the Roman Republic"
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
            />
          )}
        </Field>
        <Field label="Description" hint="Optional. Scope, themes or geography.">
          {(p) => (
            <Textarea {...p} rows={3} maxLength={LIMITS.timelineDescription} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Historical context, overarching themes or geographical boundaries" />
          )}
        </Field>
      </form>
    </Modal>
  );
}

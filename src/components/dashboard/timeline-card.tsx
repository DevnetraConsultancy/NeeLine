"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, Check, Clock, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { errorMessage } from "@/lib/client/api";
import { LIMITS } from "@/lib/validation/schemas";
import { timeAgo } from "@/lib/time-ago";
import type { TimelineSummary } from "@/types/api";

interface Props {
  timeline: TimelineSummary;
  onRename: (name: string) => Promise<void>;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function TimelineCard({ timeline, onRename, onTrash, onRestore, onDelete }: Props) {
  const trashed = timeline.deletedAt !== null;
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = editing?.trim();
    if (!next || next === timeline.name) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      await onRename(next);
      setEditing(null);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="glass group flex h-full flex-col rounded-xl p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong">
      {editing !== null ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input
            autoFocus
            aria-label="Timeline name"
            className="h-9"
            maxLength={LIMITS.timelineName}
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(null);
            }}
            disabled={saving}
          />
          <IconButton icon={Check} size="sm" label="Save name" type="submit" disabled={saving} />
          <IconButton icon={X} size="sm" label="Cancel rename" onClick={() => setEditing(null)} />
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold leading-snug text-fg">
            {trashed ? timeline.name : (
              <Link href={`/timeline/${timeline.id}`} className="hover:text-accent">{timeline.name}</Link>
            )}
          </h2>
          {!trashed && <IconButton icon={Pencil} size="sm" label={`Rename ${timeline.name}`} onClick={() => setEditing(timeline.name)} className="-mr-2 -mt-1 shrink-0" />}
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}

      {timeline.description && <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{timeline.description}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5" aria-hidden />
          {timeline.eventCount} {timeline.eventCount === 1 ? "event" : "events"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          <span>Updated <time dateTime={timeline.updatedAt}>{timeAgo(timeline.updatedAt)}</time></span>
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        {trashed ? (
          <>
            <Button size="sm" icon={RotateCcw} onClick={onRestore}>Restore</Button>
            <Button size="sm" variant="ghost" icon={Trash2} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={onDelete}>Delete forever</Button>
          </>
        ) : (
          <>
            <Link
              href={`/timeline/${timeline.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-accent hover:bg-accent-soft"
              aria-label={`Open ${timeline.name}`}
            >
              Open
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <IconButton icon={Trash2} size="sm" variant="danger-ghost" label={`Move ${timeline.name} to trash`} onClick={onTrash} />
          </>
        )}
      </div>
    </article>
  );
}

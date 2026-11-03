import { eventFields, type EventFields, type TimelineEvent } from "@/lib/domain/events";

/**
 * Undo/redo history for the studio. Actions record full snapshots; deleted
 * events are restored under their original id, so later history entries that
 * refer to them stay valid. An entry moves between stacks only after the
 * server confirms the operation.
 */

export const MAX_HISTORY = 50;

/** `id` is assigned by record() and lets an in-flight undo find its entry even if the stacks changed meanwhile. */
export type HistoryAction = { id?: number } & (
  | { kind: "create"; label: string; event: TimelineEvent }
  | { kind: "update"; label: string; before: TimelineEvent; after: TimelineEvent }
  | { kind: "delete"; label: string; events: TimelineEvent[] }
  | { kind: "import"; label: string; events: TimelineEvent[] }
  | { kind: "rename"; label: string; before: string; after: string }
);

let nextId = 1;

export type HistoryOperation =
  | { type: "delete-events"; ids: string[] }
  | { type: "restore-events"; events: TimelineEvent[] }
  | { type: "update-event"; id: string; fields: EventFields }
  | { type: "rename-timeline"; name: string };

export interface History {
  undo: HistoryAction[];
  redo: HistoryAction[];
}

export const emptyHistory: History = { undo: [], redo: [] };

export function record(history: History, action: HistoryAction): History {
  return { undo: [...history.undo.slice(-(MAX_HISTORY - 1)), { ...action, id: nextId++ }], redo: [] };
}

export function undoOperation(action: HistoryAction): HistoryOperation {
  switch (action.kind) {
    case "create":
      return { type: "delete-events", ids: [action.event.id] };
    case "import":
      return { type: "delete-events", ids: action.events.map((e) => e.id) };
    case "delete":
      return { type: "restore-events", events: action.events };
    case "update":
      return { type: "update-event", id: action.before.id, fields: eventFields(action.before) };
    case "rename":
      return { type: "rename-timeline", name: action.before };
  }
}

export function redoOperation(action: HistoryAction): HistoryOperation {
  switch (action.kind) {
    case "create":
      return { type: "restore-events", events: [action.event] };
    case "import":
      return { type: "restore-events", events: action.events };
    case "delete":
      return { type: "delete-events", ids: action.events.map((e) => e.id) };
    case "update":
      return { type: "update-event", id: action.after.id, fields: eventFields(action.after) };
    case "rename":
      return { type: "rename-timeline", name: action.after };
  }
}

/** Call after the undo of `action` succeeded on the server: moves that entry (not just the newest) to redo. */
export function afterUndo(history: History, action: HistoryAction): History {
  const entry = history.undo.find((a) => a.id === action.id);
  if (!entry) return history;
  return { undo: history.undo.filter((a) => a !== entry), redo: [...history.redo, entry] };
}

/** Call after the redo of `action` succeeded on the server. */
export function afterRedo(history: History, action: HistoryAction): History {
  const entry = history.redo.find((a) => a.id === action.id);
  if (!entry) return history;
  return { undo: [...history.undo, entry], redo: history.redo.filter((a) => a !== entry) };
}

/** Drop an entry the server says can no longer be applied. */
export function discard(history: History, action: HistoryAction): History {
  return { undo: history.undo.filter((a) => a.id !== action.id), redo: history.redo.filter((a) => a.id !== action.id) };
}

function mapAction(action: HistoryAction, fn: (events: TimelineEvent[]) => TimelineEvent[]): HistoryAction | null {
  switch (action.kind) {
    case "rename":
      return action;
    case "create": {
      const [event] = fn([action.event]);
      return event ? { ...action, event } : null;
    }
    case "update": {
      const [before, after] = fn([action.before, action.after]);
      return before && after ? { ...action, before, after } : null;
    }
    case "delete":
    case "import": {
      const events = fn(action.events);
      return events.length > 0 ? { ...action, events } : null;
    }
  }
}

function mapHistory(history: History, fn: (events: TimelineEvent[]) => TimelineEvent[]): History {
  const apply = (stack: HistoryAction[]) =>
    stack.map((a) => mapAction(a, fn)).filter((a): a is HistoryAction => a !== null);
  return { undo: apply(history.undo), redo: apply(history.redo) };
}

/** Forget events that were deleted outside the history (e.g. with their layer). */
export function forgetEvents(history: History, ids: ReadonlySet<string>): History {
  return mapHistory(history, (events) => events.filter((e) => !ids.has(e.id)));
}

/** After a layer is deleted and its events kept, point history at the new layer. */
export function moveLayer(history: History, fromLayerId: string, toLayerId: string): History {
  return mapHistory(history, (events) => events.map((e) => (e.layerId === fromLayerId ? { ...e, layerId: toLayerId } : e)));
}

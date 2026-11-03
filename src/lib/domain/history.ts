import { eventFields, type EventFields, type TimelineEvent } from "@/lib/domain/events";

/**
 * Undo/redo history for the studio. Actions record full snapshots; deleted
 * events are restored under their original id, so later history entries that
 * refer to them stay valid. An entry moves between stacks only after the
 * server confirms the operation.
 */

export const MAX_HISTORY = 50;

export type HistoryAction =
  | { kind: "create"; label: string; event: TimelineEvent }
  | { kind: "update"; label: string; before: TimelineEvent; after: TimelineEvent }
  | { kind: "delete"; label: string; events: TimelineEvent[] }
  | { kind: "import"; label: string; events: TimelineEvent[] }
  | { kind: "rename"; label: string; before: string; after: string };

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
  return { undo: [...history.undo.slice(-(MAX_HISTORY - 1)), action], redo: [] };
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

/** Call after the undo operation succeeded on the server. */
export function afterUndo(history: History): History {
  const action = history.undo.at(-1);
  if (!action) return history;
  return { undo: history.undo.slice(0, -1), redo: [...history.redo, action] };
}

/** Call after the redo operation succeeded on the server. */
export function afterRedo(history: History): History {
  const action = history.redo.at(-1);
  if (!action) return history;
  return { undo: [...history.undo, action], redo: history.redo.slice(0, -1) };
}

/** Drop the newest entry of a stack, e.g. when the server says it can no longer apply. */
export function discardLatest(history: History, stack: "undo" | "redo"): History {
  return { ...history, [stack]: history[stack].slice(0, -1) };
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

"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  badge?: number;
}

interface TabsProps<T extends string> {
  label: string;
  value: T;
  items: ReadonlyArray<TabItem<T>>;
  onChange: (value: T) => void;
  /** id of the TabPanel these tabs control. */
  panelId: string;
  className?: string;
}

/** WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends. */
export function Tabs<T extends string>({ label, value, items, onChange, panelId, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex rounded-md border border-line bg-surface p-1", className)}>
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${baseId}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors",
              selected ? "bg-surface-solid text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {item.icon && <item.icon className="size-4" aria-hidden />}
            {item.label}
            {item.badge !== undefined && (
              <span className={cn("min-w-5 rounded-full px-1.5 text-xs tabular-nums", selected ? "bg-accent-soft text-accent" : "bg-surface-hover")}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, labelledBy, children, className }: { id: string; labelledBy?: string; children: ReactNode; className?: string }) {
  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0} className={className}>
      {children}
    </div>
  );
}

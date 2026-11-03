"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  description?: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  /** Renders the trigger; spread the given props onto a <button>. */
  trigger: (props: {
    id: string;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  }) => ReactNode;
  items: Array<MenuItem | "separator">;
  label: string;
  align?: "start" | "end";
  className?: string;
}

/** Dropdown menu with arrow-key navigation, Escape to close and focus return. */
export function Menu({ trigger, items, label, align = "end", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerId = useId();
  const menuId = useId();
  const actionable = items.flatMap((item, index) => (item !== "separator" && !item.disabled ? [index] : []));

  const focusItem = (position: number) => {
    const index = actionable[(position + actionable.length) % actionable.length];
    itemRefs.current[index]?.focus();
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) document.getElementById(triggerId)?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    requestAnimationFrame(() => focusItem(0));
    return () => document.removeEventListener("pointerdown", onPointer);
    // focusItem only depends on refs and the static item list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = actionable.indexOf(itemRefs.current.findIndex((el) => el === document.activeElement));
    if (e.key === "ArrowDown") focusItem(current + 1);
    else if (e.key === "ArrowUp") focusItem(current - 1);
    else if (e.key === "Home") focusItem(0);
    else if (e.key === "End") focusItem(actionable.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({
        id: triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
        onClick: () => setOpen((v) => !v),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        },
      })}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          aria-labelledby={triggerId}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "glass-strong absolute top-full z-50 mt-2 w-64 animate-pop-in rounded-lg p-1.5",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) =>
            item === "separator" ? (
              <div key={`sep-${index}`} role="separator" className="my-1.5 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-surface-hover focus:bg-surface-hover focus:outline-none disabled:opacity-50",
                  item.danger ? "text-danger" : "text-fg",
                )}
              >
                {item.icon && <item.icon className={cn("mt-0.5 size-4 shrink-0", item.danger ? "text-danger" : "text-fg-muted")} aria-hidden />}
                <span className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  {item.description && <span className="text-xs text-fg-muted">{item.description}</span>}
                </span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

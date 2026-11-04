"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** When false, Escape and backdrop clicks do nothing (e.g. while saving). */
  dismissible?: boolean;
  /** Icon shown beside the title. */
  icon?: ReactNode;
}

const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

/**
 * Accessible modal on the native <dialog> element: the browser traps focus,
 * makes the rest of the page inert and restores focus on close. On small
 * screens it becomes a bottom sheet.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md", dismissible = true, icon }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    // Remember what had focus; the browser only restores it on close(), and
    // dialogs are often unmounted while open, so restore it ourselves.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (dismissibleRef.current) onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "glass-strong fixed m-0 mt-auto w-full max-w-none rounded-t-xl p-0 text-fg backdrop:animate-fade-in",
        "max-h-[92dvh] sm:m-auto sm:max-h-[86dvh] sm:rounded-xl",
        open && "flex flex-col animate-slide-up sm:animate-pop-in",
        widths[size],
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <span className="hairline-strata shrink-0 opacity-60" aria-hidden />
      <header className="flex items-start gap-3 border-b border-line px-5 pb-3 pt-4">
        {icon && <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold leading-tight text-fg">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-sm text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <IconButton icon={X} label="Close" size="sm" onClick={onClose} disabled={!dismissible} className="-mr-2 -mt-1" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
    </dialog>
  );
}

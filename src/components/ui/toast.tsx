"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface ToastOptions {
  tone?: ToastTone;
  description?: string;
  action?: { label: string; onClick: () => void };
  /** Milliseconds; errors stay longer by default. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  title: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (title: string, options?: ToastOptions) => void;
  success: (title: string, options?: Omit<ToastOptions, "tone">) => void;
  error: (title: string, options?: Omit<ToastOptions, "tone">) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const toneClass = { success: "text-success", error: "text-danger", info: "text-accent" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (title: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      const tone = options.tone ?? "info";
      setToasts((list) => [...list.slice(-3), { ...options, id, title, tone }]);
      const duration = options.duration ?? (tone === "error" ? 8000 : 4500);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, options) => show(title, { ...options, tone: "success" }),
      error: (title, options) => show(title, { ...options, tone: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="glass-strong pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-lg p-4"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", toneClass[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-fg-muted">{t.description}</p>}
                {t.action && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-accent hover:underline"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="-m-1 rounded-sm p-1 text-fg-muted hover:text-fg"
                onClick={() => dismiss(t.id)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

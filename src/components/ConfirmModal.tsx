"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-sm rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.1] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                isDestructive
                  ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                  : "bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/30"
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h3
                className="text-xs font-bold theme-card-title leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
              <p className="text-[9.5px] font-mono theme-text-muted">
                Confirmation required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-6 h-6 flex items-center justify-center rounded-lg theme-text-muted hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            title="Close (X)"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Body */}
        <div className="p-4">
          <p className="text-xs theme-text-muted leading-relaxed font-light">
            {message}
          </p>
        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3 py-1 rounded-lg theme-pill text-xs font-mono hover:opacity-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-3.5 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 transition-all ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                : "btn-gold"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

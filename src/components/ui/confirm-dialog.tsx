"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/client/api";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** May throw; the message is shown in the dialog and it stays open. */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = "Cancel", destructive = true, onConfirm, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      dismissible={!busy}
      icon={destructive ? <Trash2 className="size-5 text-danger" aria-hidden /> : <AlertTriangle className="size-5" aria-hidden />}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} loading={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-fg-muted">{message}</div>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}

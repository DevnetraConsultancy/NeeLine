"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CircleHelp } from "lucide-react";

const HelpDialog = dynamic(() => import("@/components/layout/help-dialog"), { ssr: false });

const HelpContext = createContext<{ openHelp: () => void } | null>(null);

/** Owns the guide dialog so the account menu and the footer can both open it. */
export function HelpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openHelp: () => setOpen(true) }), []);
  return (
    <HelpContext.Provider value={value}>
      {children}
      {open && <HelpDialog onClose={() => setOpen(false)} />}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used inside <HelpProvider>.");
  return ctx;
}

/** Plain text button, used in the footer. */
export function HelpLink({ className }: { className?: string }) {
  const { openHelp } = useHelp();
  return (
    <button type="button" onClick={openHelp} className={className}>
      <CircleHelp className="size-4" aria-hidden />
      Help and shortcuts
    </button>
  );
}

"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/layout/theme";
import { HelpProvider } from "@/components/layout/help";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <HelpProvider>{children}</HelpProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

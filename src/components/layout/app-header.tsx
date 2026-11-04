"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, CircleHelp, LogOut, User } from "lucide-react";
import { BrandLink } from "@/components/layout/brand";
import { useHelp } from "@/components/layout/help";
import { ThemeToggle } from "@/components/layout/theme";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";

/** Site header. `wide` spans the full window (the studio); otherwise it matches the page width. */
export function AppHeader({ children, className, wide = false }: { children?: ReactNode; className?: string; wide?: boolean }) {
  return (
    <header className={cn("glass glass-blur sticky top-0 z-40 rounded-none border-x-0 border-t-0", className)}>
      <div className={cn("mx-auto flex h-12 items-center gap-1 px-3 sm:px-4", !wide && "max-w-7xl sm:px-6")}>
        <BrandLink />
        <div className="flex-1">{children}</div>
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}

function AccountMenu() {
  const { data: session, status } = useSession();
  const { openHelp } = useHelp();
  if (status === "loading") return <span className="skeleton size-9 rounded-md" aria-hidden />;

  if (!session?.user) {
    return (
      <Link href="/#get-started" className="inline-flex h-8 items-center rounded-full border border-line px-3.5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-hover">
        Sign in
      </Link>
    );
  }

  const { name, email, image, isGuest } = session.user;
  const displayName = isGuest ? "Guest" : name || email || "Account";

  return (
    <Menu
      label="Account"
      items={[
        {
          label: isGuest ? "Guest workspace" : displayName,
          description: isGuest ? "Deleted after 30 days without use" : (email ?? undefined),
          icon: User,
          disabled: true,
          onSelect: () => undefined,
        },
        "separator",
        { label: "Help and shortcuts", icon: CircleHelp, onSelect: openHelp },
        { label: "Sign out", icon: LogOut, onSelect: () => void signOut({ callbackUrl: "/" }) },
      ]}
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Account: ${displayName}`}
          className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-fg hover:bg-surface-hover"
        >
          {image ? (
            <Image src={image} alt="" width={24} height={24} className="size-6 rounded-full" />
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
              <User className="size-4" aria-hidden />
            </span>
          )}
          <span className="hidden max-w-32 truncate md:inline">{displayName}</span>
          <ChevronDown className="size-4 text-fg-muted" aria-hidden />
        </button>
      )}
    />
  );
}

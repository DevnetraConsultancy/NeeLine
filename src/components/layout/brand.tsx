import Link from "next/link";
import { cn } from "@/lib/cn";

/** The NeeLine mark: a number line with a single origin tick. Brand artwork, not a UI icon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-md text-fg", className)} aria-label="NeeLine home">
      <span className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
        <BrandMark />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Nee<span className="text-accent">Line</span>
      </span>
    </Link>
  );
}

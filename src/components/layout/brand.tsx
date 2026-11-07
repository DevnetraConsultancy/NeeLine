import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The NeeLine mark: the golden hourglass (public/logo.png) set in a black,
 * gold-edged tile. The tile stays black in both themes; it is an emblem, not a surface.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#b8912a]/80 bg-black",
        "shadow-[inset_0_0_10px_rgb(212_175_55/0.22),0_1px_2px_rgb(0_0_0/0.4)]",
        className,
      )}
    >
      <Image src="/logo.png" alt="" width={32} height={32} priority className="size-8 select-none" />
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-md text-fg", className)} aria-label="NeeLine home">
      <BrandMark />
      <span className="font-serif text-[1.375rem] leading-none tracking-wide">
        Nee<span className="text-accent">Line</span>
      </span>
    </Link>
  );
}

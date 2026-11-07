import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The NeeLine mark: the golden hourglass artwork filling a small black tile
 * with a soft gold ring and glow. The tile stays black in both themes.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-black",
        "ring-1 ring-[rgb(212_175_55/0.45)] shadow-[0_2px_8px_-2px_rgb(233_189_80/0.45)]",
        className,
      )}
    >
      <Image src="/brand/logo-mark.webp" alt="" width={32} height={32} priority className="size-full select-none object-cover" />
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-md text-fg", className)} aria-label="NeeLine home">
      <BrandMark />
      <span className="font-serif text-[1.15rem] leading-none tracking-tight">
        Nee<span className="text-strata">Line</span>
      </span>
    </Link>
  );
}

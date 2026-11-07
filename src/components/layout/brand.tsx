import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** The NeeLine mark: the golden hourglass (public/logo.png, transparent). Brand artwork, not a UI icon. */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  return <Image src="/logo.png" alt="" width={size} height={size} priority className={cn("size-8 select-none", className)} aria-hidden />;
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-md text-fg", className)} aria-label="NeeLine home">
      <BrandMark />
      <span className="text-base font-semibold tracking-tight">
        Nee<span className="text-accent">Line</span>
      </span>
    </Link>
  );
}

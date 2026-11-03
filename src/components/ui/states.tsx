import type { ReactNode } from "react";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-fg-muted", className)}>
      <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

interface StateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: StateProps) {
  return (
    <div className={cn("glass flex flex-col items-center rounded-xl px-6 py-12 text-center", className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: Omit<StateProps, "icon"> & { title?: string }) {
  return (
    <div role="alert" className={cn("glass flex flex-col items-center rounded-xl px-6 py-12 text-center", className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "section" }) {
  return <Tag className={cn("glass rounded-xl", className)}>{children}</Tag>;
}

/** Plain data table styled to match the glass surfaces. */
export function Table({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("glass overflow-x-auto rounded-lg", className)}>
      <table className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-fg-muted">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

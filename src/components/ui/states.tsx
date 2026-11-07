import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
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
    <div className={cn("glass flex flex-col items-center rounded-xl px-6 py-8 text-center", className)}>
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: Omit<StateProps, "icon"> & { title?: string }) {
  return (
    <div role="alert" className={cn("glass flex flex-col items-center rounded-xl px-6 py-8 text-center", className)}>
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
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

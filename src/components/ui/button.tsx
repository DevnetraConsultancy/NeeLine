import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.3)]",
  secondary: "glass text-fg hover:bg-surface-hover hover:border-line-strong",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-hover",
  danger: "bg-danger text-danger-fg hover:opacity-90 shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon: Icon,
  iconEnd: IconEnd,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "lg" ? "size-5" : "size-4";
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className={cn(iconSize, "animate-spin")} aria-hidden /> : Icon && <Icon className={iconSize} aria-hidden />}
      {children}
      {IconEnd && !loading && <IconEnd className={iconSize} aria-hidden />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: Exclude<ButtonVariant, "danger"> | "danger-ghost";
  size?: "sm" | "md";
  pressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  size = "md",
  pressed,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const variantClass =
    variant === "danger-ghost" ? "text-fg-muted hover:text-danger hover:bg-danger-soft" : variants[variant];
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        base,
        variantClass,
        size === "sm" ? "size-8" : "size-10",
        pressed && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className,
      )}
      {...rest}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

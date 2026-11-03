"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const controlClass =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle " +
  "transition-[border-color,box-shadow,background-color] duration-150 " +
  "hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] " +
  "disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/40";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; required?: boolean }) => ReactNode;
}

/** Label, control, hint and error wired together for assistive technology. */
export function Field({ label, hint, error, required, hideLabel, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium text-fg", hideLabel && "sr-only")}>
        {label}
        {required && <span className="text-fg-muted font-normal"> (required)</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, required })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(controlClass, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(controlClass, "min-h-24 py-2 leading-relaxed resize-y", className)} {...rest} />;
}

export function Select({ className, children, ref, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(controlClass, "h-10 appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
    </div>
  );
}

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** On/off switch built on a native checkbox. */
export function Switch({ label, description, checked, onChange, className, disabled, ...rest }: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex items-start justify-between gap-4", disabled && "opacity-50", className)}>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-fg">{label}</span>
        {description && <span className="text-xs text-fg-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          {...rest}
        />
        <span
          aria-hidden
          className="h-6 w-10 rounded-full border border-line-strong bg-surface transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        />
        <span
          aria-hidden
          className="absolute left-1 top-1 size-4 rounded-full bg-fg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-fg"
        />
      </span>
    </label>
  );
}

/** Two or more mutually exclusive choices shown as a segmented control (a radio group). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  size = "md",
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <fieldset className={cn("inline-flex rounded-md border border-line bg-surface p-1", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "relative flex items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors",
            size === "sm" ? "h-6" : "h-8",
            value === option.value ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span className="peer-focus-visible:underline peer-focus-visible:underline-offset-4">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

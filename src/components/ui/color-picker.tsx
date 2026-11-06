"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { LAYER_COLOR_PRESETS } from "@/lib/domain/colors";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Colours already taken elsewhere; still selectable but marked. */
  usedColors?: ReadonlyArray<string>;
  className?: string;
  /** Smaller swatches in one wrapping row, with the label kept for screen readers only. */
  compact?: boolean;
}

/** The 16 layer colours as a radio group (arrow keys move, Space/Enter selects). */
export function ColorPicker({ label, value, onChange, usedColors = [], className, compact = false }: ColorPickerProps) {
  const labelId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = value.toLowerCase();
  const used = new Set(usedColors.map((c) => c.toLowerCase()));
  const selectedIndex = LAYER_COLOR_PRESETS.findIndex((p) => p.hex === current);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + LAYER_COLOR_PRESETS.length) % LAYER_COLOR_PRESETS.length;
    onChange(LAYER_COLOR_PRESETS[next].hex);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn("flex flex-col", !compact && "gap-2", className)}>
      <span id={labelId} className={compact ? "sr-only" : "text-sm font-medium text-fg"}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-8 gap-2"}>
        {LAYER_COLOR_PRESETS.map((preset, index) => {
          const selected = preset.hex === current;
          const taken = used.has(preset.hex) && !selected;
          return (
            <button
              key={preset.hex}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${preset.label}${taken ? " (used by another layer)" : ""}`}
              title={preset.label}
              tabIndex={selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
              onClick={() => onChange(preset.hex)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "relative flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                compact ? "size-6" : "size-8",
                selected ? "border-fg" : "border-transparent",
                taken && "opacity-40",
              )}
              style={{ backgroundColor: preset.hex }}
            >
              {selected && <Check className={compact ? "size-3.5 text-[#070c16]" : "size-4 text-[#070c16]"} strokeWidth={3} aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

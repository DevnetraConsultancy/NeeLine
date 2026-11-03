export interface ColorPreset {
  hex: string;
  label: string;
}

/** The 16 layer colours. They are data colours, separate from the UI accent. */
export const LAYER_COLOR_PRESETS: readonly ColorPreset[] = [
  { hex: "#c9a84c", label: "Imperial Gold" },
  { hex: "#38bdf8", label: "Sky Azure" },
  { hex: "#10b981", label: "Emerald Jade" },
  { hex: "#f43f5e", label: "Crimson Rose" },
  { hex: "#a855f7", label: "Royal Amethyst" },
  { hex: "#f97316", label: "Amber Bronze" },
  { hex: "#06b6d4", label: "Persian Cyan" },
  { hex: "#ec4899", label: "Lotus Pink" },
  { hex: "#84cc16", label: "Olive Peridot" },
  { hex: "#eab308", label: "Byzantine Yellow" },
  { hex: "#6366f1", label: "Lapis Indigo" },
  { hex: "#14b8a6", label: "Aegean Teal" },
  { hex: "#d97706", label: "Terracotta Rust" },
  { hex: "#8b5cf6", label: "Violet Iris" },
  { hex: "#0ea5e9", label: "Cobalt Blue" },
  { hex: "#f472b6", label: "Coral Carnelian" },
];

export const DEFAULT_EVENT_COLOR = LAYER_COLOR_PRESETS[0].hex;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

export function isPresetColor(hex: string): boolean {
  const lower = hex.toLowerCase();
  return LAYER_COLOR_PRESETS.some((p) => p.hex === lower);
}

/**
 * Choose a colour for a new layer: the preferred preset if no other layer
 * uses it, otherwise the first unused preset, otherwise cycle through presets.
 */
export function pickLayerColor(usedColors: Iterable<string>, preferred?: string | null, layerCount = 0): string {
  const used = new Set(Array.from(usedColors, (c) => c.toLowerCase()));
  const wanted = preferred?.toLowerCase();
  if (wanted && isPresetColor(wanted) && !used.has(wanted)) return wanted;
  const free = LAYER_COLOR_PRESETS.find((p) => !used.has(p.hex));
  return free ? free.hex : LAYER_COLOR_PRESETS[layerCount % LAYER_COLOR_PRESETS.length].hex;
}

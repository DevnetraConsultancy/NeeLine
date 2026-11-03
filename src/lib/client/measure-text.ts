let context: CanvasRenderingContext2D | null | undefined;
let fontFamily = "";
const cache = new Map<string, number>();

/**
 * Width of a label in the font the canvas actually renders with. One shared
 * offscreen context and a cache, so layout does not create canvases per label.
 */
export function measureText(text: string, fontSizePx: number, weight = 600): number {
  if (typeof document === "undefined") return text.length * fontSizePx * 0.55;
  if (context === undefined) {
    context = document.createElement("canvas").getContext("2d");
    fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
  }
  if (!context) return text.length * fontSizePx * 0.55;

  const key = `${weight}|${fontSizePx}|${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  context.font = `${weight} ${fontSizePx}px ${fontFamily}`;
  const width = context.measureText(text).width;
  if (cache.size > 5000) cache.clear();
  cache.set(key, width);
  return width;
}

/** Call after web fonts finish loading so cached fallback widths are dropped. */
export function resetTextMeasurements(): void {
  cache.clear();
  context = undefined;
}

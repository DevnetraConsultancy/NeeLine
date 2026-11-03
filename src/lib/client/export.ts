import { formatDateLabel } from "@/lib/domain/dates";
import { endDate, startDate, sortByDate, type TimelineEvent } from "@/lib/domain/events";
import type { Layer } from "@/types/api";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "timeline";
}

/** Tab-separated text: date or period, layer, title, notes. Tabs and newlines inside fields become spaces. */
export function eventsToTxt(events: TimelineEvent[], layers: Layer[]): string {
  const layerName = new Map(layers.map((l) => [l.id, l.name]));
  const clean = (s: string | null) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const rows = sortByDate(events).map((e) => {
    const end = endDate(e);
    const date = end ? `${formatDateLabel(startDate(e))} – ${formatDateLabel(end)}` : formatDateLabel(startDate(e));
    return [date, layerName.get(e.layerId) ?? "General", clean(e.title), clean(e.notes)].join("\t");
  });
  return ["Date / Period\tLayer\tTitle\tNotes", ...rows].join("\n");
}

// ─── PNG ────────────────────────────────────────────────────────────

const SCALE = 2;

function num(value: string | null, fallback = 0): number {
  const n = value === null ? Number.NaN : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parses translate(x y) and scale(s) — the only transforms the canvas uses. */
function applyTransform(ctx: CanvasRenderingContext2D, transform: string | null): void {
  if (!transform) return;
  for (const [, fn, args] of transform.matchAll(/(translate|scale)\(([^)]*)\)/g)) {
    const [a = 0, b] = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") ctx.translate(a, b ?? 0);
    else ctx.scale(a, b ?? a);
  }
}

function paint(ctx: CanvasRenderingContext2D, el: Element, style: CSSStyleDeclaration, fill: boolean, stroke: boolean): void {
  const fillColor = style.fill;
  const strokeColor = style.stroke;
  if (fill && fillColor && fillColor !== "none") {
    ctx.globalAlpha *= num(style.fillOpacity, 1);
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (stroke && strokeColor && strokeColor !== "none") {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = num(style.strokeWidth, 1);
    const dash = el.getAttribute("stroke-dasharray");
    ctx.setLineDash(dash ? dash.split(/[\s,]+/).map(Number).filter(Number.isFinite) : []);
    ctx.lineCap = (style.strokeLinecap as CanvasLineCap) || "butt";
    ctx.stroke();
  }
}

function draw(ctx: CanvasRenderingContext2D, el: Element): void {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return;
  const opacity = num(style.opacity, 1);
  if (opacity === 0) return;

  ctx.save();
  ctx.globalAlpha *= opacity;
  applyTransform(ctx, el.getAttribute("transform"));

  const tag = el.tagName.toLowerCase();
  const attr = (name: string) => num(el.getAttribute(name));
  ctx.beginPath();
  if (tag === "line") {
    ctx.moveTo(attr("x1"), attr("y1"));
    ctx.lineTo(attr("x2"), attr("y2"));
    paint(ctx, el, style, false, true);
  } else if (tag === "circle") {
    ctx.arc(attr("cx"), attr("cy"), attr("r"), 0, Math.PI * 2);
    paint(ctx, el, style, true, true);
  } else if (tag === "rect") {
    const rx = attr("rx");
    if (rx > 0) ctx.roundRect(attr("x"), attr("y"), attr("width"), attr("height"), rx);
    else ctx.rect(attr("x"), attr("y"), attr("width"), attr("height"));
    paint(ctx, el, style, true, true);
  } else if (tag === "path") {
    const path = new Path2D(el.getAttribute("d") ?? "");
    if (style.fill && style.fill !== "none") {
      ctx.fillStyle = style.fill;
      ctx.fill(path);
    }
    if (style.stroke && style.stroke !== "none") {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = num(style.strokeWidth, 1);
      ctx.stroke(path);
    }
  } else if (tag === "text") {
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.fill || "#000";
    const anchor = el.getAttribute("text-anchor");
    ctx.textAlign = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(el.textContent ?? "", attr("x"), attr("y"));
  } else if (tag === "g" || tag === "svg") {
    for (const child of Array.from(el.children)) draw(ctx, child);
  }
  ctx.restore();
}

/**
 * Redraws the live SVG onto a 2x canvas using computed styles, so the export
 * uses the same fonts and colours the user sees.
 */
export async function exportSvgAsPng(svg: SVGSVGElement, background: string, filename: string): Promise<void> {
  const { width, height } = svg.getBoundingClientRect();
  if (width === 0 || height === 0) throw new Error("The canvas is not visible, so it cannot be exported.");
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create an image.");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  for (const child of Array.from(svg.children)) draw(ctx, child);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Your browser could not create the PNG.");
  downloadBlob(blob, filename);
}

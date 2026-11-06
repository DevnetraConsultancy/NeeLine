"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { measureText, resetTextMeasurements } from "@/lib/client/measure-text";
import { exportSvgAsPng } from "@/lib/client/export";
import { dateValue, formatDateLabel, formatSpanLabel } from "@/lib/domain/dates";
import { endDate, startDate, type TimelineEvent } from "@/lib/domain/events";
import {
  axisMarkers, baseX, buildScale, clampPan, fitView, gapBadges, inView, layoutItems, panPreservingFocus, valueAtBaseX, zoomAt,
  collapsedDotY, pointCardTop, spinePosition, stackGeometry, stackScale, TICK, type ItemLayout, type LayoutInput, type LayoutMode, type Scale, type Viewport,
} from "@/lib/domain/layout";
import type { Layer } from "@/types/api";
import { CanvasHud } from "@/components/studio/canvas-hud";

export interface CanvasColors {
  bg: string;
  spine: string;
  text: string;
}

export interface CanvasHandle {
  fit: () => void;
  /** Fits on the next commit, after pending data changes (e.g. an import) have rendered. */
  requestFit: () => void;
  zoomBy: (factor: number) => void;
  exportPng: (filename: string) => Promise<void>;
}

interface CanvasProps {
  timelineId: string;
  /** Past -> origin -> present colours for the spine when following the theme; null keeps a solid spine. */
  spineStrata: [string, string, string] | null;
  events: TimelineEvent[];
  layers: Layer[];
  colors: CanvasColors;
  zeroColor: string;
  showControls: boolean;
  showGapBorder: boolean;
  onEditEvent: (event: TimelineEvent) => void;
  onSetVisibleLayers: (ids: string[]) => void;
  onManageLayers: () => void;
  toolbarSlot: HTMLElement | null;
  ref?: Ref<CanvasHandle>;
}

interface CanvasEvent extends LayoutInput {
  source: TimelineEvent;
  layerColor: string;
  layerName: string;
}

const DOT_RADIUS = 5;
const PAN_STEP = 80;
const viewportKey = (id: string) => `neeline_viewport_${id}`;

interface SavedViewport extends Viewport {
  mode: LayoutMode;
}

function readSavedViewport(timelineId: string): SavedViewport | null {
  try {
    const raw = JSON.parse(localStorage.getItem(viewportKey(timelineId)) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw.zoom !== "number" || typeof raw.panX !== "number") return null;
    const mode = raw.layoutMode === "proportional" ? "proportional" : "even";
    return Number.isFinite(raw.zoom) && Number.isFinite(raw.panX) ? { zoom: raw.zoom, panX: raw.panX, mode } : null;
  } catch {
    return null;
  }
}

function describe(e: CanvasEvent): string {
  const end = endDate(e.source);
  const when = end ? formatSpanLabel(startDate(e.source), end) : formatDateLabel(startDate(e.source));
  return `${e.title}, ${when}, layer ${e.layerName}`;
}

export function TimelineCanvas({
  timelineId, spineStrata, events, layers, colors, zeroColor, showControls, showGapBorder,
  onEditEvent, onSetVisibleLayers, onManageLayers, toolbarSlot, ref,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorLineRef = useRef<SVGLineElement>(null);
  const cursorLabelRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 600 });
  const [mode, setMode] = useState<LayoutMode>("even");
  const [view, setView] = useState<Viewport>({ zoom: 1, panX: 0 });
  const [showGaps, setShowGaps] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(0);
  const hasViewport = useRef(false);
  const [fitRequest, setFitRequest] = useState(0);
  const requestFit = useCallback(() => setFitRequest((n) => n + 1), []);

  // ─── Data ───────────────────────────────────────────────────────────

  const layerById = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);

  const allValues = useMemo(
    () => events.flatMap((e) => {
      const end = endDate(e);
      return end ? [dateValue(startDate(e)), dateValue(end)] : [dateValue(startDate(e))];
    }),
    [events],
  );
  const scale = useMemo(() => buildScale(mode, allValues), [mode, allValues]);

  const visible = useMemo<CanvasEvent[]>(
    () => events.flatMap((e) => {
      const layer = layerById.get(e.layerId);
      if (!layer?.visible) return [];
      return [{
        id: e.id, title: e.title, hasNotes: Boolean(e.notes), start: startDate(e), end: endDate(e),
        source: e, layerColor: layer.color, layerName: layer.name,
      }];
    }),
    [events, layerById],
  );
  const visibleValues = useMemo(() => visible.flatMap((e) => (e.end ? [dateValue(e.start), dateValue(e.end)] : [dateValue(e.start)])), [visible]);

  const worldX = useCallback((value: number) => baseX(scale, value) * view.zoom, [scale, view.zoom]);

  // Layout depends on zoom, not on pan: panning only moves a transform.
  const items = useMemo(
    () => layoutItems(visible, worldX, measureText),
    // fontsReady re-measures once web fonts have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, worldX, fontsReady],
  );
  const markers = useMemo(() => axisMarkers(items, (e) => e.layerColor), [items]);
  const gaps = useMemo(() => (showGaps ? gapBadges(visible.map((e) => ({ id: e.id, date: e.start })), worldX) : []), [showGaps, visible, worldX]);

  // ─── Viewport ───────────────────────────────────────────────────────

  // Leave room at both ends for the widest card, so labels are never cut off.
  const labelPadding = useMemo(
    () => visible.reduce((max, e) => Math.max(max, (measureText(e.title, 12.5) + 36) / 2 + 16), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, fontsReady],
  );

  // The reachable world: panning stops once only a sliver of content is left on screen.
  const bounds = useMemo(() => {
    if (visibleValues.length === 0) return null;
    const bases = visibleValues.map((v) => baseX(scale, v));
    return { min: Math.min(...bases), max: Math.max(...bases) };
  }, [scale, visibleValues]);

  const clampView = useCallback((v: Viewport): Viewport => {
    if (!bounds) return v;
    const panX = clampPan(v.panX, bounds.min * v.zoom, bounds.max * v.zoom, size.width);
    return panX === v.panX ? v : { ...v, panX };
  }, [bounds, size.width]);

  const fit = useCallback(() => {
    const next = fitView(scale, visibleValues, size.width, labelPadding);
    if (next) setView(next);
  }, [scale, visibleValues, size.width, labelPadding]);

  const zoomBy = useCallback((factor: number, focusX = size.width / 2) => {
    setView((v) => clampView(zoomAt(mode, v, factor, focusX, size.width)));
  }, [clampView, mode, size.width]);

  useEffect(() => {
    document.fonts?.ready.then(() => {
      resetTextMeasurements();
      setFontsReady((n) => n + 1);
    });
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure now, so the first fit uses the real width rather than the default.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize((s) => (Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Restore the saved viewport, or fit once when there is none.
  useEffect(() => {
    hasViewport.current = false;
    const saved = readSavedViewport(timelineId);
    if (saved) {
      setMode(saved.mode);
      setView({ zoom: saved.zoom, panX: saved.panX });
      hasViewport.current = true;
    }
  }, [timelineId]);

  useEffect(() => {
    if (hasViewport.current || visibleValues.length === 0 || size.width < 2) return;
    hasViewport.current = true;
    fit();
  }, [fit, visibleValues.length, size.width]);

  useEffect(() => {
    if (!hasViewport.current) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(viewportKey(timelineId), JSON.stringify({ zoom: view.zoom, panX: view.panX, layoutMode: mode }));
      } catch {
        // Storage unavailable: the viewport is simply not remembered.
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [timelineId, view, mode]);

  // Keep the centred anchor still when events are added or removed in even mode.
  const previousScale = useRef<Scale>(scale);
  useLayoutEffect(() => {
    const prev = previousScale.current;
    previousScale.current = scale;
    if (prev === scale || prev.mode !== "even" || scale.mode !== "even" || !hasViewport.current) return;
    setView((v) => {
      const panX = panPreservingFocus(prev, scale, v);
      return panX === null ? v : { ...v, panX };
    });
  }, [scale]);

  // When the reachable world shrinks (layers hidden, events removed, saved
  // viewports restored), pull a stranded view back to the content.
  useLayoutEffect(() => {
    if (hasViewport.current) setView((v) => clampView(v));
  }, [clampView]);

  // Fit when the canvas starts showing layers again, or when exactly one layer
  // is shown on its own. Adding layers to ones already on screen keeps the view.
  const visibleLayerKey = layers.filter((l) => l.visible).map((l) => l.id).sort().join(",");
  const previousLayerKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    const prev = previousLayerKey.current;
    previousLayerKey.current = visibleLayerKey;
    if (prev === null || prev === visibleLayerKey || !visibleLayerKey) return;
    if (prev === "" || !visibleLayerKey.includes(",")) requestFit();
  }, [visibleLayerKey, requestFit]);

  // Declared after the effects above, so its plain setView wins over their
  // functional updates in the same commit.
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useLayoutEffect(() => {
    if (fitRequest === 0) return;
    hasViewport.current = true;
    fitRef.current();
  }, [fitRequest]);

  const switchMode = useCallback((next: LayoutMode) => {
    setMode(next);
    requestFit();
  }, [requestFit]);

  useImperativeHandle(ref, () => ({
    fit,
    requestFit,
    zoomBy: (factor: number) => zoomBy(factor),
    exportPng: async (filename: string) => {
      const before = view;
      fit();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        if (svgRef.current) await exportSvgAsPng(svgRef.current, colors.bg, filename);
      } finally {
        setView(before);
      }
    },
  }), [colors.bg, fit, requestFit, view, zoomBy]);

  // ─── Pointer, wheel and keyboard ────────────────────────────────────

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchDistance = useRef<number | null>(null);
  const offsetX = size.width / 2 + view.panX;

  const updateCursor = (clientX: number | null) => {
    const line = cursorLineRef.current;
    const label = cursorLabelRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!line || !label || !rect || clientX === null || visible.length === 0) {
      line?.setAttribute("visibility", "hidden");
      if (label) label.textContent = "";
      return;
    }
    const x = clientX - rect.left;
    line.setAttribute("x1", String(x));
    line.setAttribute("x2", String(x));
    line.setAttribute("visibility", "visible");
    // A year spans [y, y + 1) on the axis, so round down.
    const year = Math.floor(valueAtBaseX(scale, (x - offsetX) / view.zoom));
    label.textContent = year === 0 ? "0" : `${Math.abs(year) < 10_000 ? Math.abs(year) : Math.abs(year).toLocaleString("en-US")} ${year < 0 ? "BCE" : "CE"}`;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setView((v) => clampView({ ...v, panX: v.panX - e.deltaX }));
        return;
      }
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      zoomBy(factor, e.clientX - rect.left);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampView, zoomBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") {
      updateCursor(e.clientX);
      // The button was released outside the canvas: stop treating this as a drag.
      if (e.buttons === 0) {
        pointers.current.delete(e.pointerId);
        return;
      }
    }
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDistance.current) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = containerRef.current!.getBoundingClientRect();
      zoomBy(distance / pinchDistance.current, (a.x + b.x) / 2 - rect.left);
      pinchDistance.current = distance;
      dragged.current = true;
      return;
    }
    const dx = e.clientX - prev.x;
    if (!dragged.current && Math.abs(dx) < 3) return;
    if (!dragged.current) containerRef.current?.setPointerCapture(e.pointerId);
    dragged.current = true;
    setView((v) => clampView({ ...v, panX: v.panX + dx }));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
  };

  const onCanvasKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowLeft") setView((v) => clampView({ ...v, panX: v.panX + PAN_STEP * (e.shiftKey ? 4 : 1) }));
    else if (e.key === "ArrowRight") setView((v) => clampView({ ...v, panX: v.panX - PAN_STEP * (e.shiftKey ? 4 : 1) }));
    else return;
    e.preventDefault();
  };

  const activate = (event: TimelineEvent) => {
    if (!dragged.current) onEditEvent(event);
  };

  // ─── Geometry for rendering ─────────────────────────────────────────

  const geometry = stackGeometry(items);
  const spineY = spinePosition(size.height, geometry.above);
  // When the stack is taller than the space above the spine, the whole stack
  // shrinks uniformly (boxes, text and spacing together). The group below is
  // scaled about the spine; x positions are counter-scaled so every event
  // stays glued to its date on the axis.
  const shrink = stackScale(geometry.above, spineY);
  const viewLeft = -offsetX;
  const viewRight = size.width - offsetX;
  const [spineLeft, spineRight] = visibleValues.length
    ? [Math.min(...visibleValues.map(worldX)) - 60, Math.max(...visibleValues.map(worldX)) + 60]
    : [viewLeft + size.width * 0.15, viewRight - size.width * 0.15];
  const spineGradientId = useId();
  const spineStroke = spineStrata ? `url(#${spineGradientId})` : colors.spine;
  const zeroX = worldX(0);
  const showZero = visibleValues.length > 0 && zeroX >= spineLeft && zeroX <= spineRight;

  const isOnScreen = (item: ItemLayout<CanvasEvent>) =>
    item.kind === "point"
      ? inView(item.x - item.width / 2, item.x + item.width / 2, viewLeft, viewRight)
      : inView(Math.min(item.x1, item.x - item.width / 2), Math.max(item.x2, item.x + item.width / 2), viewLeft, viewRight);
  // Every event stays in the DOM in date order so Tab can reach it; off-screen
  // ones render nothing visible, and focusing one pans it into view.
  const ordered = [...items].sort((a, b) => (a.kind === "point" ? a.x : a.x1) - (b.kind === "point" ? b.x : b.x1));
  const onEventFocus = (id: string | null) => {
    setFocusId(id);
    const item = id ? items.find((i) => i.event.id === id) : undefined;
    if (!item || isOnScreen(item)) return;
    setView((v) => clampView({ ...v, panX: v.panX + size.width / 2 - (offsetX + item.x) }));
  };
  const focused = focusId ? items.find((i) => i.event.id === focusId) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: colors.bg }}>
      <div
        ref={containerRef}
        role="group"
        aria-roledescription="timeline canvas"
        aria-label={`Timeline canvas with ${visible.length} visible events. Use arrow keys to pan, plus and minus to zoom, 0 to fit. Tab moves between events.`}
        tabIndex={0}
        className="absolute inset-0 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
        style={{ cursor: "grab" }}
        onKeyDown={onCanvasKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") updateCursor(null);
        }}
      >
        <svg ref={svgRef} width={size.width} height={size.height} className="absolute inset-0" style={{ fontFamily: "var(--font-sans)" }}>
          {spineStrata && (
            <defs>
              {/* userSpaceOnUse, so the PNG exporter can rebuild it exactly. */}
              <linearGradient id={spineGradientId} gradientUnits="userSpaceOnUse" x1={spineLeft} y1={0} x2={spineRight} y2={0}>
                <stop offset="0" stopColor={spineStrata[0]} />
                <stop offset="0.55" stopColor={spineStrata[1]} />
                <stop offset="1" stopColor={spineStrata[2]} />
              </linearGradient>
            </defs>
          )}
          <line ref={cursorLineRef} y1={0} y2={size.height} stroke={colors.spine} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.3} visibility="hidden" />
          <g transform={`translate(${offsetX} 0)`}>
            {visible.length === 0 ? (
              <EmptyCanvas cx={viewLeft + size.width / 2} cy={size.height / 2} colors={colors} hasEvents={events.length > 0} />
            ) : (
              <>
                <line x1={spineLeft} x2={spineRight} y1={spineY} y2={spineY} stroke={spineStroke} strokeWidth={6} opacity={0.18} />
                <line x1={spineLeft} x2={spineRight} y1={spineY} y2={spineY} stroke={spineStroke} strokeWidth={2.5} opacity={0.9} />
                <circle cx={spineLeft} cy={spineY} r={3} fill={colors.spine} />
                <circle cx={spineRight} cy={spineY} r={3} fill={colors.spine} />

                {gaps.filter((g) => inView(Math.min(g.x1, g.x2), Math.max(g.x1, g.x2), viewLeft, viewRight)).map((g) => {
                  const mid = (g.x1 + g.x2) / 2;
                  const w = measureText(g.label, 11, 500) + 16;
                  return (
                    <g key={g.key}>
                      <line x1={Math.min(g.x1, g.x2) + 12} x2={Math.max(g.x1, g.x2) - 12} y1={spineY} y2={spineY} stroke={colors.spine} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.35} />
                      <rect x={mid - w / 2} y={spineY + 34} width={w} height={18} rx={9} fill={colors.bg} stroke={showGapBorder ? colors.spine : "none"} strokeOpacity={0.5} />
                      <text x={mid} y={spineY + 47} textAnchor="middle" fill={colors.text} fontSize={11} fontWeight={500} opacity={0.8}>{g.label}</text>
                    </g>
                  );
                })}

                {markers.filter((m) => inView(m.x, m.x, viewLeft, viewRight)).map((m) => (
                  <g key={m.key}>
                    <line x1={m.x} x2={m.x} y1={spineY - TICK / 2} y2={spineY + TICK / 2} stroke={m.isZero ? zeroColor : m.colorFrom} strokeWidth={m.isZero ? 3 : 2.5} />
                    <circle cx={m.x} cy={spineY} r={m.isZero ? 4.5 : 3.5} fill={m.isZero ? zeroColor : m.colorFrom} stroke={colors.bg} strokeWidth={1.5} />
                    {m.showLabel && !m.isZero && !(showZero && Math.abs(m.x - zeroX) < 44) && (
                      <text x={m.x} y={spineY + TICK / 2 + 16} textAnchor="middle" fill={colors.text} fontSize={11} fontWeight={600}>{m.label}</text>
                    )}
                  </g>
                ))}

                {showZero && (
                  <g aria-hidden>
                    <line x1={zeroX} x2={zeroX} y1={spineY - TICK - 4} y2={spineY + TICK + 4} stroke={zeroColor} strokeWidth={3} />
                    <circle cx={zeroX} cy={spineY} r={4} fill={zeroColor} />
                    <rect x={zeroX - 16} y={spineY + TICK + 6} width={32} height={22} rx={5} fill={colors.bg} stroke={zeroColor} strokeWidth={2.5} />
                    <text x={zeroX} y={spineY + TICK + 21} textAnchor="middle" fill={zeroColor} fontSize={12} fontWeight={800}>0</text>
                  </g>
                )}

                <g transform={shrink === 1 ? undefined : `translate(0 ${spineY}) scale(${shrink}) translate(0 ${-spineY})`}>
                  {ordered.map((item) => (
                    <EventMark
                      key={item.event.id}
                      item={
                        shrink === 1 ? item : item.kind === "point"
                          ? { ...item, x: item.x / shrink }
                          : { ...item, x: item.x / shrink, x1: item.x1 / shrink, x2: item.x2 / shrink }
                      }
                      offscreen={!isOnScreen(item)}
                      spineY={spineY}
                      bracketY={geometry.bracketY}
                      colors={colors}
                      zeroColor={zeroColor}
                      onActivate={activate}
                      onFocusChange={onEventFocus}
                    />
                  ))}
                </g>
              </>
            )}
          </g>
        </svg>

        {focused && <EventTooltip item={focused} offsetX={offsetX} spineY={spineY} width={size.width} height={size.height} />}
      </div>

      <CanvasHud
        visible={showControls}
        mode={mode}
        onModeChange={switchMode}
        showGaps={showGaps}
        onToggleGaps={() => setShowGaps((v) => !v)}
        layers={layers}
        events={events}
        onSetVisibleLayers={onSetVisibleLayers}
        onManageLayers={onManageLayers}
        zoomPercent={Math.round(view.zoom * 100)}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(1 / 1.25)}
        onFit={fit}
        cursorLabelRef={cursorLabelRef}
        toolbarSlot={toolbarSlot}
      />
    </div>
  );
}

/** Message centred in the canvas. No axis is drawn, because without events there is no scale. */
function EmptyCanvas({ cx, cy, colors, hasEvents }: { cx: number; cy: number; colors: CanvasColors; hasEvents: boolean }) {
  return (
    <g>
      <text x={cx} y={cy - 4} textAnchor="middle" fill={colors.text} fontSize={16} fontWeight={600}>
        {hasEvents ? "No events in the visible layers" : "This timeline has no events yet"}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill={colors.text} fontSize={13} opacity={0.7}>
        {hasEvents ? "Turn layers on from the Layers menu." : "Use Add event to place your first date."}
      </text>
    </g>
  );
}

interface MarkProps {
  item: ItemLayout<CanvasEvent>;
  spineY: number;
  offscreen: boolean;
  bracketY: (tier: number) => number;
  colors: CanvasColors;
  zeroColor: string;
  onActivate: (event: TimelineEvent) => void;
  onFocusChange: (id: string | null) => void;
}

/** One event as a focusable SVG button: a card on a stem, a collapsed dot, or a bracket. */
function EventMark({ item, spineY, offscreen, bracketY, colors, zeroColor, onActivate, onFocusChange }: MarkProps) {
  const e = item.event;
  const isZero = e.start.year === 0 || e.end?.year === 0;
  // Everything except the spine takes the layer colour: stems, brackets and card borders.
  const border = isZero ? zeroColor : e.layerColor;
  const a11y = {
    role: "button",
    tabIndex: 0,
    "aria-label": `${describe(e)}. Press Enter to edit.`,
    onClick: () => onActivate(e.source),
    onKeyDown: (k: KeyboardEvent) => {
      if (k.key === "Enter" || k.key === " ") {
        k.preventDefault();
        onActivate(e.source);
      }
    },
    onFocus: () => onFocusChange(e.id),
    onBlur: () => onFocusChange(null),
    onMouseEnter: () => onFocusChange(e.id),
    onMouseLeave: () => onFocusChange(null),
    style: { cursor: "pointer", outline: "none" },
    className: "[&:focus-visible>.focus-ring]:opacity-100",
  } as const;

  if (offscreen) return <g {...a11y} />;

  if (item.kind === "span") {
    const y = spineY + bracketY(item.tier);
    return (
      <g {...a11y}>
        <line x1={item.x1} x2={item.x1} y1={y + 12} y2={spineY} stroke={e.layerColor} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.5} />
        <line x1={item.x2} x2={item.x2} y1={y + 12} y2={spineY} stroke={e.layerColor} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.5} />
        <line x1={item.x1} x2={item.x2} y1={y} y2={y} stroke={e.layerColor} strokeWidth={2.5} />
        <line x1={item.x1} x2={item.x1} y1={y} y2={y + 12} stroke={e.layerColor} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={item.x2} x2={item.x2} y1={y} y2={y + 12} stroke={e.layerColor} strokeWidth={2.5} strokeLinecap="round" />
        <rect className="focus-ring" x={item.x - item.width / 2 - 4} y={y - 17} width={item.width + 8} height={34} rx={9} fill="none" stroke={colors.spine} strokeWidth={2} opacity={0} />
        <rect x={item.x - item.width / 2} y={y - 13} width={item.width} height={26} rx={6} fill={colors.bg} stroke={border} strokeWidth={isZero ? 3 : 1.8} />
        <text x={e.hasNotes ? item.x - 7 : item.x} y={y + 4} textAnchor="middle" fill={colors.text} fontSize={12} fontWeight={600}>{e.title}</text>
        {e.hasNotes && <NotesDot x={item.x + item.width / 2 - 12} y={y} color={e.layerColor} />}
      </g>
    );
  }

  if (item.collapsed) {
    const dotY = spineY + collapsedDotY;
    return (
      <g {...a11y}>
        <circle className="focus-ring" cx={item.x} cy={dotY} r={DOT_RADIUS + 4} fill="none" stroke={colors.spine} strokeWidth={2} opacity={0} />
        <circle cx={item.x} cy={dotY} r={DOT_RADIUS} fill={border} stroke={colors.bg} strokeWidth={1.5} />
      </g>
    );
  }
  const top = spineY + pointCardTop(item.tier);
  return (
    <g {...a11y}>
      <line x1={item.x} x2={item.x} y1={spineY - TICK / 2} y2={top + 24} stroke={isZero ? zeroColor : e.layerColor} strokeWidth={isZero ? 2.5 : 1.5} />
      <rect className="focus-ring" x={item.x - item.width / 2 - 4} y={top - 4} width={item.width + 8} height={32} rx={9} fill="none" stroke={colors.spine} strokeWidth={2} opacity={0} />
      <rect x={item.x - item.width / 2} y={top} width={item.width} height={24} rx={6} fill={colors.bg} stroke={border} strokeWidth={isZero ? 3 : 1.8} />
      <text x={e.hasNotes ? item.x - 6 : item.x} y={top + 16} textAnchor="middle" fill={colors.text} fontSize={12.5} fontWeight={600}>{e.title}</text>
      {e.hasNotes && <NotesDot x={item.x + item.width / 2 - 12} y={top + 12} color={e.layerColor} />}
    </g>
  );
}

/** Small "has notes" marker: three short lines, drawn without a nested svg so PNG export is exact. */
function NotesDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - 5} ${y - 5})`} aria-hidden>
      <line x1={0} x2={10} y1={1} y2={1} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={0} x2={10} y1={5} y2={5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={0} x2={6} y1={9} y2={9} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function EventTooltip({ item, offsetX, spineY, width, height }: { item: ItemLayout<CanvasEvent>; offsetX: number; spineY: number; width: number; height: number }) {
  const e = item.event;
  const end = endDate(e.source);
  const left = Math.max(8, Math.min(offsetX + item.x - 140, width - 296));
  // Below the axis labels when a full-height tooltip fits; otherwise pinned to
  // the bottom edge so long notes grow upward instead of off screen.
  const MAX_HEIGHT = 280;
  const below = spineY + 56;
  const position = below + MAX_HEIGHT <= height ? { top: below } : { bottom: 8 };
  return (
    <div
      role="tooltip"
      className="glass-strong pointer-events-none absolute z-20 w-72 rounded-lg p-3 text-sm"
      style={{ left, maxHeight: MAX_HEIGHT, ...position }}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: e.layerColor }} aria-hidden />
        {e.layerName}
        <span aria-hidden>·</span>
        {end ? "Period" : "Milestone"}
      </div>
      <p className="mt-1 font-semibold text-fg">{e.title}</p>
      <p className="text-xs font-medium text-accent">{end ? formatSpanLabel(startDate(e.source), end) : formatDateLabel(startDate(e.source))}</p>
      {e.source.notes && <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs text-fg-muted">{e.source.notes}</p>}
      <p className="mt-2 text-xs text-fg-subtle">Click or press Enter to edit</p>
    </div>
  );
}

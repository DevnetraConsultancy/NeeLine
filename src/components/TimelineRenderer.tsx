"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { layoutLabels, formatDateLabel, TIER_SPACING } from "@/lib/timeline-layout";

interface EventData {
  id: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  title: string;
  description: string | null;
  color: string;
}

interface TimelineRendererProps {
  events: EventData[];
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
  onEventClick: (event: EventData) => void;
  onBgClick: (year: number, isBce: boolean) => void;
}

const BASE_PIXELS_PER_YEAR = 0.05;
const MIN_ZOOM = 0.001;
const MAX_ZOOM = 50;

const TICK_HEIGHT = 12;
const DOT_RADIUS = 4;

export default function TimelineRenderer({
  events,
  bgColor,
  spineColor,
  tickColor,
  textColor,
  onEventClick,
  onBgClick,
}: TimelineRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [layoutMode, setLayoutMode] = useState<"even" | "proportional">("even");
  const [showGaps, setShowGaps] = useState(true);

  // Drag state
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Touch state
  const touchStart = useRef({ x: 0, y: 0 });
  const pinchDist = useRef<number | null>(null);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Year-to-x coordinate mapping
  // Evenly-spaced event positions (base, centered at 0)
  const baseEventPositions = useMemo(() => {
    const map = new Map<string, number>();
    if (events.length === 0) return map;
    const sorted = [...events].sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      return ya - yb;
    });
    const SPACING = 180;
    const totalSpan = (sorted.length - 1) * SPACING;
    const start = -totalSpan / 2;
    sorted.forEach((e, i) => {
      map.set(e.id, start + i * SPACING);
    });
    return map;
  }, [events]);

  // Year-to-x mapping (supports both modes)
  const yearToX = useCallback(
    (year: number): number => {
      if (layoutMode === "proportional") {
        return dimensions.width / 2 + year * BASE_PIXELS_PER_YEAR * zoom + panX;
      }
      // Even mode: find event or interpolate
      const match = events.find(
        (e) => (e.isBce ? -Math.abs(e.year) : e.year) === year
      );
      if (match) {
        const baseX = baseEventPositions.get(match.id);
        if (baseX !== undefined) {
          return dimensions.width / 2 + baseX * zoom + panX;
        }
      }
      // Interpolate between nearest events
      const sorted = events
        .map((e) => ({
          ey: e.isBce ? -Math.abs(e.year) : e.year,
          x:
            dimensions.width / 2 +
            (baseEventPositions.get(e.id) ?? 0) * zoom +
            panX,
        }))
        .sort((a, b) => a.ey - b.ey);
      if (sorted.length === 0) return dimensions.width / 2;
      if (year <= sorted[0].ey) return sorted[0].x;
      if (year >= sorted[sorted.length - 1].ey)
        return sorted[sorted.length - 1].x;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (year >= sorted[i].ey && year <= sorted[i + 1].ey) {
          const t =
            (year - sorted[i].ey) / (sorted[i + 1].ey - sorted[i].ey);
          return sorted[i].x + t * (sorted[i + 1].x - sorted[i].x);
        }
      }
      return dimensions.width / 2;
    },
    [events, baseEventPositions, layoutMode, zoom, panX, dimensions.width]
  );

  // X-to-year: inverse of yearToX
  const xToYear = useCallback(
    (x: number): number => {
      if (layoutMode === "proportional") {
        return (x - dimensions.width / 2 - panX) / (BASE_PIXELS_PER_YEAR * zoom);
      }
      const sorted = events
        .map((e) => ({
          ey: e.isBce ? -Math.abs(e.year) : e.year,
          x:
            dimensions.width / 2 +
            (baseEventPositions.get(e.id) ?? 0) * zoom +
            panX,
        }))
        .sort((a, b) => a.x - b.x);
      if (sorted.length === 0) return 0;
      if (x <= sorted[0].x) return sorted[0].ey;
      if (x >= sorted[sorted.length - 1].x)
        return sorted[sorted.length - 1].ey;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (x >= sorted[i].x && x <= sorted[i + 1].x) {
          const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
          return sorted[i].ey + t * (sorted[i + 1].ey - sorted[i].ey);
        }
      }
      return 0;
    },
    [events, baseEventPositions, layoutMode, zoom, panX, dimensions.width]
  );

  // Check if any event is at year 0 (to avoid origin marker overlap)
  const hasYearZero = useMemo(
    () => events.some((e) => e.year === 0 && !e.isBce),
    [events]
  );

  // Sorted events for gap calculation
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      return ya - yb;
    });
  }, [events]);

  // Layout labels
  const layoutItems = useMemo(
    () => layoutLabels(events, yearToX),
    [events, yearToX]
  );

  // Compute spine extents — only if events exist
  const hasEvents = events.length > 0;
  const spineLeft = useMemo(() => {
    if (!hasEvents) return 0;
    if (layoutMode === "proportional") {
      const years = events.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
      years.push(0);
      const minYear = Math.min(...years);
      return yearToX(minYear);
    }
    const positions = Array.from(baseEventPositions.values()).map(
      (bx) => dimensions.width / 2 + bx * zoom + panX
    );
    return Math.min(...positions) - 60;
  }, [hasEvents, baseEventPositions, layoutMode, events, zoom, panX, dimensions.width, yearToX]);

  const spineRight = useMemo(() => {
    if (!hasEvents) return 0;
    if (layoutMode === "proportional") {
      const years = events.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
      years.push(0);
      const maxYear = Math.max(...years);
      return yearToX(maxYear);
    }
    const positions = Array.from(baseEventPositions.values()).map(
      (bx) => dimensions.width / 2 + bx * zoom + panX
    );
    return Math.max(...positions) + 60;
  }, [hasEvents, baseEventPositions, layoutMode, events, zoom, panX, dimensions.width, yearToX]);

  const spineY = dimensions.height / 2;
  const originX = yearToX(0);

  // Fit all events
  const fitAll = useCallback(() => {
    if (events.length === 0) return;
    if (layoutMode === "proportional") {
      const years = events.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
      years.push(0);
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const range = maxYear - minYear;
      if (range === 0) { setZoom(1); setPanX(0); return; }
      const padding = 80;
      const availableWidth = dimensions.width - padding * 2;
      const newZoom = availableWidth / (range * BASE_PIXELS_PER_YEAR);
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoom(clampedZoom);
      const centerX = (minYear + maxYear) / 2;
      setPanX(-centerX * BASE_PIXELS_PER_YEAR * clampedZoom);
      return;
    }
    const SPACING = 180;
    const totalSpan = (events.length - 1) * SPACING;
    const padding = 120;
    const availableWidth = dimensions.width - padding * 2;
    const newZoom =
      events.length > 1 ? availableWidth / totalSpan : 1;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
    setPanX(0);
  }, [events, layoutMode, dimensions.width]);

  // Auto-fit on first load and when events change
  const prevEventCount = useRef(events.length);
  useEffect(() => {
    if (events.length !== prevEventCount.current || prevEventCount.current === 0) {
      prevEventCount.current = events.length;
      if (events.length > 0) {
        // Double RAF to let dimensions settle
        requestAnimationFrame(() => {
          requestAnimationFrame(() => fitAllRef.current());
        });
      }
    }
  }, [events.length, fitAll]);

  // Auto-fit when layout mode changes so events stay centered
  const fitAllRef = useRef(fitAll);
  fitAllRef.current = fitAll;
  const prevLayoutMode = useRef(layoutMode);
  useEffect(() => {
    if (prevLayoutMode.current !== layoutMode) {
      prevLayoutMode.current = layoutMode;
      // Double RAF ensures React has committed the new state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitAllRef.current());
      });
    }
  }, [layoutMode, fitAll]);

  // Mouse wheel zoom — use native non-passive listener to preventDefault()
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
      const baseX = (mouseX - dimensions.width / 2 - panX) / zoom;
      const newPanX = mouseX - dimensions.width / 2 - baseX * newZoom;
      setZoom(newZoom);
      setPanX(newPanX);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoom, panX, dimensions.width]);

  // Mouse drag pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      hasDragged.current = false;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDragged.current = true;
      }
      lastMouse.current = { x: e.clientX, y: e.clientY };

      setPanX((prev) => prev + dx);
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDragging.current = true;
      hasDragged.current = false;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging.current) {
        const dx = e.touches[0].clientX - touchStart.current.x;
        if (Math.abs(dx) > 2) hasDragged.current = true;
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setPanX((prev) => prev + dx);
      } else if (e.touches.length === 2 && pinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = dist / pinchDist.current;
        pinchDist.current = dist;

        const midX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 -
          (containerRef.current?.getBoundingClientRect().left ?? 0);
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
        const baseX = (midX - dimensions.width / 2 - panX) / zoom;
        const newPanX = midX - dimensions.width / 2 - baseX * newZoom;
        setZoom(newZoom);
        setPanX(newPanX);
      }
    },
    [zoom, panX, dimensions.width]
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    pinchDist.current = null;
  }, []);

  // Click on background to add event at that year
  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasDragged.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const svgX = e.clientX - rect.left;
      const year = xToYear(svgX);
      const roundedYear = Math.round(year);
      const isBce = roundedYear < 0;

      onBgClick(Math.abs(roundedYear), isBce);
    },
    [xToYear, onBgClick]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "0") {
        fitAll();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fitAll]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none"
      style={{ cursor: isDragging.current ? "grabbing" : "grab", backgroundColor: bgColor }}

      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        onClick={handleSvgClick}
      >
        {hasEvents && (
          <>
            {/* Spine line */}
            <line
              x1={spineLeft}
              y1={spineY}
              x2={spineRight}
              y2={spineY}
              stroke={spineColor}
              strokeWidth="2"
              opacity="0.6"
            />

            {/* Origin "0" marker — hidden when a Year Zero event exists */}
            {!hasYearZero && (
            <g>
              {/* Tick */}
              <line
                x1={originX}
                y1={spineY - TICK_HEIGHT}
                x2={originX}
                y2={spineY + TICK_HEIGHT}
                stroke={tickColor}
                strokeWidth="2"
                opacity="0.8"
              />
              {/* Origin circle */}
              <circle
                cx={originX}
                cy={spineY}
                r="5"
                fill="none"
                stroke={tickColor}
                strokeWidth="1.5"
                opacity="0.6"
              />
              {/* Origin label */}
              <text
                x={originX}
                y={spineY + TICK_HEIGHT + 18}
                textAnchor="middle"
                fill={textColor}
                fontSize="12"
                fontFamily="var(--font-mono)"
                opacity="0.5"
              >
                0
              </text>
            </g>
            )}

            {/* Event ticks and labels */}
            {layoutItems.map((item) => (
              <g key={item.eventId}>
                {/* Tick mark */}
                <line
                  x1={item.x}
                  y1={spineY - TICK_HEIGHT / 2}
                  x2={item.x}
                  y2={spineY + TICK_HEIGHT / 2}
                  stroke={item.color}
                  strokeWidth="2"
                  opacity="0.9"
                />

                {/* Small dot on spine */}
                <circle cx={item.x} cy={spineY} r="2.5" fill={item.color} opacity="0.8" />

                {item.collapsed ? (
                  // Collapsed dot with hover
                  <g
                    onMouseEnter={() => {
                      setHoveredEvent(item.eventId);
                      setTooltipPos({ x: item.x, y: spineY });
                    }}
                    onMouseLeave={() => setHoveredEvent(null)}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasDragged.current) {
                        onEventClick({
                          id: item.eventId,
                          year: item.year,
                          isBce: item.isBce,
                          month: item.month,
                          day: item.day,
                          title: item.title,
                          description: item.description,
                          color: item.color,
                        });
                      }
                    }}
                  >
                    <circle
                      cx={item.x}
                      cy={spineY - TICK_HEIGHT / 2 - DOT_RADIUS - 4 - item.tier * TIER_SPACING}
                      r={DOT_RADIUS}
                      fill={item.color}
                      opacity="0.8"
                    />
                  </g>
                ) : (
                  // Full label
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasDragged.current) {
                        onEventClick({
                          id: item.eventId,
                          year: item.year,
                          isBce: item.isBce,
                          month: item.month,
                          day: item.day,
                          title: item.title,
                          description: item.description,
                          color: item.color,
                        });
                      }
                    }}
                  >
                    {/* Connector line from tick to label */}
                    <line
                      x1={item.x}
                      y1={spineY - TICK_HEIGHT / 2}
                      x2={item.x}
                      y2={spineY - TICK_HEIGHT / 2 - 6 - item.tier * TIER_SPACING}
                      stroke={item.color}
                      strokeWidth="1"
                      opacity="0.4"
                    />

                    {/* Label background */}
                    <rect
                      x={item.x - item.labelWidth / 2}
                      y={spineY - TICK_HEIGHT / 2 - 22 - item.tier * TIER_SPACING}
                      width={item.labelWidth}
                      height="20"
                      rx="3"
                      fill={bgColor}
                      stroke={item.color}
                      strokeWidth="1"
                      opacity="0.9"
                    />

                    {/* Label text */}
                    <text
                      x={item.x}
                      y={spineY - TICK_HEIGHT / 2 - 8 - item.tier * TIER_SPACING}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="12"
                      fontFamily="var(--font-display)"
                      fontWeight="500"
                    >
                      {item.title}
                    </text>

                    {/* Year label below the tick */}
                    <text
                      x={item.x}
                      y={spineY + TICK_HEIGHT / 2 + 14 + item.tier * 2}
                      textAnchor="middle"
                      fill={item.color}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      opacity="0.7"
                    >
                      {formatDateLabel(item.year, item.isBce, item.month, item.day)}
                    </text>
                  </g>
                )}
              </g>
            ))}

            {/* Time gap indicators between consecutive events */}
            {showGaps && sortedEvents.length > 1 && sortedEvents.map((ev, i) => {
              if (i === 0) return null;
              const prev = sortedEvents[i - 1];
              const prevYear = prev.isBce ? -Math.abs(prev.year) : prev.year;
              const curYear = ev.isBce ? -Math.abs(ev.year) : ev.year;
              const gap = Math.abs(curYear - prevYear);
              if (gap === 0) return null;
              const prevX = yearToX(prevYear);
              const curX = yearToX(curYear);
              const midX = (prevX + curX) / 2;
              const gapText = gap >= 1000000 ? `${(gap / 1000000).toFixed(gap % 1000000 === 0 ? 0 : 1)}M years` : gap >= 1000 ? `${(gap / 1000).toFixed(gap % 1000 === 0 ? 0 : 1)}k years` : `${gap.toLocaleString()} years`;
              return (
                <g key={`gap-${i}`}>
                  {/* Dashed connector line on spine */}
                  <line
                    x1={prevX + 8}
                    y1={spineY}
                    x2={curX - 8}
                    y2={spineY}
                    stroke={spineColor}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  {/* Gap label */}
                  <text
                    x={midX}
                    y={spineY + TICK_HEIGHT + 16}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    opacity="0.35"
                  >
                    {gapText}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {/* Empty state */}
        {!hasEvents && (
          <text
            x={dimensions.width / 2}
            y={dimensions.height / 2}
            textAnchor="middle"
            fill={textColor}
            fontSize="14"
            fontFamily="var(--font-body)"
            opacity="0.2"
          >
            Add your first event to begin
          </text>
        )}
      </svg>

      {/* Tooltip for collapsed labels */}
      {hoveredEvent && tooltipPos && (() => {
        const item = layoutItems.find((i) => i.eventId === hoveredEvent);
        if (!item) return null;
        return (
          <div
            className="absolute pointer-events-none z-40 px-3 py-2 rounded-lg border shadow-lg max-w-xs"
            style={{
              left: Math.min(tooltipPos.x, dimensions.width - 200),
              top: tooltipPos.y - 60,
              backgroundColor: bgColor,
              borderColor: item.color,
              color: textColor,
            }}
          >
            <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {item.title}
            </div>
            <div className="text-xs mt-0.5 opacity-60" style={{ fontFamily: "var(--font-mono)" }}>
              {formatDateLabel(item.year, item.isBce, item.month, item.day)}
            </div>
            {item.description && (
              <div className="text-xs mt-1 opacity-50">{item.description}</div>
            )}
          </div>
        );
      })()}

      {/* Layout mode + gap toggle controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
        <button
          onClick={() => setLayoutMode((m) => m === "even" ? "proportional" : "even")}
          className="px-3 h-7 rounded-lg bg-[#0f1f38]/80 border border-[#c9a84c]/20 text-[#c9a84c] text-[10px] hover:bg-[#0f1f38] transition-colors"
          style={{ fontFamily: "var(--font-mono)" }}
          title="Toggle spacing mode"
        >
          {layoutMode === "even" ? "⬌ Even" : "⬌ Proportional"}
        </button>
        <button
          onClick={() => setShowGaps((g) => !g)}
          className={`px-3 h-7 rounded-lg bg-[#0f1f38]/80 border text-[10px] hover:bg-[#0f1f38] transition-colors ${
            showGaps ? "border-[#c9a84c]/40 text-[#c9a84c]" : "border-[#c9a84c]/10 text-[#c9a84c]/40"
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
          title="Show time gaps between events"
        >
          {showGaps ? "↕ Gaps" : "↕ Gaps"}
        </button>
      </div>

      {/* Fit button only */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-30">
        <button
          onClick={fitAll}
          className="px-3 h-8 rounded-lg bg-[#0f1f38]/80 border border-[#c9a84c]/20 text-[#c9a84c] text-xs hover:bg-[#0f1f38] transition-colors"
          style={{ fontFamily: "var(--font-mono)" }}
          title="Fit all events (press 0)"
        >
          Fit
        </button>
      </div>
    </div>
  );
}

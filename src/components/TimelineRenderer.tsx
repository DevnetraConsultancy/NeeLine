"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { layoutLabels, formatDateLabel, TIER_SPACING } from "@/lib/timeline-layout";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
} from "lucide-react";

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
  showGapBorder?: boolean;
  onEventClick: (event: EventData) => void;
  onBgClick: (year: number, isBce: boolean) => void;
}

const BASE_PIXELS_PER_YEAR = 0.05;
const MIN_ZOOM = 0.001;
const MAX_ZOOM = 50;

const TICK_HEIGHT = 14;
const DOT_RADIUS = 5;

export default function TimelineRenderer({
  events,
  bgColor,
  spineColor,
  tickColor,
  textColor,
  showGapBorder = true,
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
  const [cursorYear, setCursorYear] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);

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
  const baseEventPositions = useMemo(() => {
    const map = new Map<string, number>();
    if (events.length === 0) return map;
    const sorted = [...events].sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      return ya - yb;
    });
    const SPACING = 200;
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

  // Check if any event is at year 0
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

  // Compute spine extents
  const hasEvents = events.length > 0;
  const spineLeft = useMemo(() => {
    if (!hasEvents) return 0;
    if (layoutMode === "proportional") {
      const years = events.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
      years.push(0);
      const minYear = Math.min(...years);
      return yearToX(minYear) - 80;
    }
    const positions = Array.from(baseEventPositions.values()).map(
      (bx) => dimensions.width / 2 + bx * zoom + panX
    );
    return Math.min(...positions) - 100;
  }, [hasEvents, baseEventPositions, layoutMode, events, zoom, panX, dimensions.width, yearToX]);

  const spineRight = useMemo(() => {
    if (!hasEvents) return 0;
    if (layoutMode === "proportional") {
      const years = events.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
      years.push(0);
      const maxYear = Math.max(...years);
      return yearToX(maxYear) + 80;
    }
    const positions = Array.from(baseEventPositions.values()).map(
      (bx) => dimensions.width / 2 + bx * zoom + panX
    );
    return Math.max(...positions) + 100;
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
      if (range === 0) {
        setZoom(1);
        setPanX(0);
        return;
      }
      const padding = 100;
      const availableWidth = dimensions.width - padding * 2;
      const newZoom = availableWidth / (range * BASE_PIXELS_PER_YEAR);
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoom(clampedZoom);
      const centerX = (minYear + maxYear) / 2;
      setPanX(-centerX * BASE_PIXELS_PER_YEAR * clampedZoom);
      return;
    }
    const SPACING = 200;
    const totalSpan = (events.length - 1) * SPACING;
    const padding = 140;
    const availableWidth = dimensions.width - padding * 2;
    const newZoom = events.length > 1 ? availableWidth / totalSpan : 1;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
    setPanX(0);
  }, [events, layoutMode, dimensions.width]);

  // Auto-fit on first load and when events change
  const prevEventCount = useRef(events.length);
  useEffect(() => {
    if (events.length !== prevEventCount.current || prevEventCount.current === 0) {
      prevEventCount.current = events.length;
      if (events.length > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => fitAllRef.current());
        });
      }
    }
  }, [events.length, fitAll]);

  // Auto-fit when layout mode changes
  const fitAllRef = useRef(fitAll);
  fitAllRef.current = fitAll;
  const prevLayoutMode = useRef(layoutMode);
  useEffect(() => {
    if (prevLayoutMode.current !== layoutMode) {
      prevLayoutMode.current = layoutMode;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitAllRef.current());
      });
    }
  }, [layoutMode, fitAll]);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
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
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        setCursorX(mouseX);
        const y = Math.round(xToYear(mouseX));
        setCursorYear(y);
      }

      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDragged.current = true;
      }
      lastMouse.current = { x: e.clientX, y: e.clientY };

      setPanX((prev) => prev + dx);
    },
    [xToYear]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    setCursorX(null);
    setCursorYear(null);
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

  // Click on background to add event at that coordinate
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

  // Manual Zoom In / Zoom Out functions
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * 1.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z / 1.25));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "0") {
        fitAll();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-") {
        zoomOut();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fitAll, zoomIn, zoomOut]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none transition-colors duration-300"
      style={{
        cursor: isDragging.current ? "grabbing" : "grab",
        backgroundColor: bgColor,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* SVG Canvas */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        onClick={handleSvgClick}
      >
        <defs>
          {/* Spine glow filter */}
          <filter id="spine-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {hasEvents && (
          <>
            {/* The Golden Spine Axis line */}
            <line
              x1={spineLeft}
              y1={spineY}
              x2={spineRight}
              y2={spineY}
              stroke={spineColor}
              strokeWidth="2.5"
              opacity="0.8"
            />
            {/* Soft halo for spine line */}
            <line
              x1={spineLeft}
              y1={spineY}
              x2={spineRight}
              y2={spineY}
              stroke={spineColor}
              strokeWidth="6"
              opacity="0.15"
            />

            {/* Origin "0 CE" Beacon */}
            {!hasYearZero && (
              <g className="origin-marker">
                {/* Vertical tick through axis */}
                <line
                  x1={originX}
                  y1={spineY - TICK_HEIGHT - 2}
                  x2={originX}
                  y2={spineY + TICK_HEIGHT + 2}
                  stroke={tickColor}
                  strokeWidth="2"
                  opacity="0.85"
                />
                {/* Celestial orbital ring */}
                <circle
                  cx={originX}
                  cy={spineY}
                  r="6.5"
                  fill="none"
                  stroke={tickColor}
                  strokeWidth="1.5"
                  opacity="0.75"
                />
                {/* Center pip */}
                <circle cx={originX} cy={spineY} r="2" fill={tickColor} opacity="0.9" />
                {/* Origin label */}
                <text
                  x={originX}
                  y={spineY + TICK_HEIGHT + 20}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                  opacity="0.7"
                >
                  0 CE
                </text>
              </g>
            )}

            {/* Time gap indicators between consecutive events */}
            {showGaps &&
              sortedEvents.length > 1 &&
              sortedEvents.map((ev, i) => {
                if (i === 0) return null;
                const prev = sortedEvents[i - 1];
                const prevYear = prev.isBce ? -Math.abs(prev.year) : prev.year;
                const curYear = ev.isBce ? -Math.abs(ev.year) : ev.year;
                const gap = Math.abs(curYear - prevYear);
                if (gap === 0) return null;
                const prevX = yearToX(prevYear);
                const curX = yearToX(curYear);
                const midX = (prevX + curX) / 2;
                const gapText =
                  gap >= 1000000
                    ? `${(gap / 1000000).toFixed(gap % 1000000 === 0 ? 0 : 1)}M yrs`
                    : gap >= 1000
                    ? `${(gap / 1000).toFixed(gap % 1000 === 0 ? 0 : 1)}k yrs`
                    : `${gap.toLocaleString()} yrs`;

                // If gap spans sufficient visual width, render
                if (Math.abs(curX - prevX) < 50) return null;

                return (
                  <g key={`gap-${i}`} className="transition-opacity duration-200">
                    {/* Dashed connector line on spine */}
                    <line
                      x1={prevX + 12}
                      y1={spineY}
                      x2={curX - 12}
                      y2={spineY}
                      stroke={spineColor}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.35"
                    />
                    {/* Gap badge background */}
                    <rect
                      x={midX - (gapText.length * 6) / 2 - 8}
                      y={spineY + TICK_HEIGHT + 8}
                      width={gapText.length * 6 + 16}
                      height="16"
                      rx="8"
                      fill={bgColor}
                      stroke={showGapBorder ? spineColor : "none"}
                      strokeWidth={showGapBorder ? "1" : "0"}
                      opacity={showGapBorder ? "0.45" : "0.25"}
                    />
                    {/* Gap label */}
                    <text
                      x={midX}
                      y={spineY + TICK_HEIGHT + 20}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      opacity="0.65"
                    >
                      {gapText}
                    </text>
                  </g>
                );
              })}

            {/* Event ticks, connectors, and cards */}
            {layoutItems.map((item) => (
              <g key={item.eventId} className="event-group">
                {/* Vertical tick on axis */}
                <line
                  x1={item.x}
                  y1={spineY - TICK_HEIGHT / 2}
                  x2={item.x}
                  y2={spineY + TICK_HEIGHT / 2}
                  stroke={item.color}
                  strokeWidth="2.5"
                  opacity="0.95"
                />

                {/* Spine dot node */}
                <circle
                  cx={item.x}
                  cy={spineY}
                  r="3.5"
                  fill={item.color}
                  stroke={bgColor}
                  strokeWidth="1.5"
                />

                {item.collapsed ? (
                  // Collapsed dot with rich tooltip
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
                    {/* Vertical guideline */}
                    <line
                      x1={item.x}
                      y1={spineY - TICK_HEIGHT / 2}
                      x2={item.x}
                      y2={spineY - TICK_HEIGHT / 2 - 8 - item.tier * TIER_SPACING}
                      stroke={item.color}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.5"
                    />
                    {/* Collapsed glowing node */}
                    <circle
                      cx={item.x}
                      cy={spineY - TICK_HEIGHT / 2 - DOT_RADIUS - 6 - item.tier * TIER_SPACING}
                      r={DOT_RADIUS}
                      fill={item.color}
                      stroke={bgColor}
                      strokeWidth="1.5"
                      opacity="0.95"
                    />
                  </g>
                ) : (
                  // Full Label Card
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
                    {/* Connector line from spine tick to label */}
                    <line
                      x1={item.x}
                      y1={spineY - TICK_HEIGHT / 2}
                      x2={item.x}
                      y2={spineY - TICK_HEIGHT / 2 - 8 - item.tier * TIER_SPACING}
                      stroke={item.color}
                      strokeWidth="1.2"
                      opacity="0.65"
                    />

                    {/* Card background */}
                    <rect
                      x={item.x - item.labelWidth / 2}
                      y={spineY - TICK_HEIGHT / 2 - 26 - item.tier * TIER_SPACING}
                      width={item.labelWidth}
                      height="24"
                      rx="6"
                      fill={bgColor}
                      stroke={item.color}
                      strokeWidth="1.5"
                      opacity="0.95"
                    />

                    {/* Event Title */}
                    <text
                      x={item.x}
                      y={spineY - TICK_HEIGHT / 2 - 10 - item.tier * TIER_SPACING}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="12.5"
                      fontFamily="var(--font-display)"
                      fontWeight="600"
                      letterSpacing="0.01em"
                    >
                      {item.title}
                    </text>

                    {/* Date label beneath the axis */}
                    <text
                      x={item.x}
                      y={spineY + TICK_HEIGHT / 2 + 16 + item.tier * 2}
                      textAnchor="middle"
                      fill={item.color}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight="500"
                      opacity="0.9"
                    >
                      {formatDateLabel(item.year, item.isBce, item.month, item.day)}
                    </text>
                  </g>
                )}
              </g>
            ))}

            {/* Interactive Hairline Mouse Cursor Guide */}
            {cursorX !== null && cursorYear !== null && !isDragging.current && (
              <g className="cursor-guide pointer-events-none">
                <line
                  x1={cursorX}
                  y1={spineY - 30}
                  x2={cursorX}
                  y2={spineY + 30}
                  stroke="#c9a84c"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />
                <circle cx={cursorX} cy={spineY} r="3" fill="#c9a84c" opacity="0.8" />
              </g>
            )}
          </>
        )}

        {/* Empty Canvas Welcome State */}
        {!hasEvents && (
          <g>
            {/* Axis preview line */}
            <line
              x1={dimensions.width / 2 - 200}
              y1={dimensions.height / 2}
              x2={dimensions.width / 2 + 200}
              y2={dimensions.height / 2}
              stroke={spineColor}
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity="0.3"
            />
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r="6"
              fill={spineColor}
              opacity="0.4"
            />
            <text
              x={dimensions.width / 2}
              y={dimensions.height / 2 - 30}
              textAnchor="middle"
              fill={textColor}
              fontSize="16"
              fontFamily="var(--font-display)"
              fontWeight="600"
              opacity="0.85"
            >
              Empty Chronicle Axis
            </text>
            <text
              x={dimensions.width / 2}
              y={dimensions.height / 2 + 35}
              textAnchor="middle"
              fill={textColor}
              fontSize="12"
              fontFamily="var(--font-mono)"
              opacity="0.4"
            >
              Click anywhere on this axis or press + Add Event to begin
            </text>
          </g>
        )}
      </svg>

      {/* Rich Floating Tooltip for collapsed events */}
      {hoveredEvent && tooltipPos && (() => {
        const item = layoutItems.find((i) => i.eventId === hoveredEvent);
        if (!item) return null;
        return (
          <div
            className="absolute pointer-events-none z-50 px-4 py-3 rounded-xl border glass-panel shadow-2xl max-w-sm"
            style={{
              left: Math.min(tooltipPos.x, dimensions.width - 240),
              top: tooltipPos.y - 75,
              borderColor: item.color,
            }}
          >
            <div
              className="text-sm font-semibold theme-card-title"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {item.title}
            </div>
            <div
              className="text-xs mt-1 font-mono font-medium"
              style={{ color: item.color }}
            >
              {formatDateLabel(item.year, item.isBce, item.month, item.day)}
            </div>
            {item.description && (
              <div className="text-xs mt-1.5 theme-text-muted leading-relaxed font-light">
                {item.description}
              </div>
            )}
          </div>
        );
      })()}

      {/* Floating HUD: Top-Right Canvas Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
        {/* Layout Mode Segmented Toggle */}
        <div className="flex items-center p-1 rounded-xl theme-hud text-[11px] font-mono shadow-lg">
          <button
            onClick={() => setLayoutMode("even")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              layoutMode === "even"
                ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold"
                : "theme-hud-btn"
            }`}
            title="Even spacing for maximum readability"
          >
            Even Space
          </button>
          <button
            onClick={() => setLayoutMode("proportional")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              layoutMode === "proportional"
                ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold"
                : "theme-hud-btn"
            }`}
            title="Proportional physical time scale"
          >
            Proportional
          </button>
        </div>

        {/* Gaps Toggle Button */}
        <button
          onClick={() => setShowGaps((g) => !g)}
          className={`h-8 px-3 rounded-xl theme-hud text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
            showGaps
              ? "border-[#c9a84c]/50 text-[#c9a84c] bg-[#c9a84c]/15 font-semibold"
              : "theme-hud-btn"
          }`}
          title="Toggle time span gap badges between consecutive events"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Gaps</span>
        </button>
      </div>

      {/* Floating HUD: Bottom-Right Zoom & Fit Dock */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 rounded-xl theme-hud shadow-2xl z-30 font-mono text-xs">
        <button
          onClick={zoomOut}
          className="w-8 h-8 rounded-lg flex items-center justify-center theme-hud-btn cursor-pointer"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={zoomIn}
          className="w-8 h-8 rounded-lg flex items-center justify-center theme-hud-btn cursor-pointer"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />
        <button
          onClick={fitAll}
          className="px-2.5 h-8 rounded-lg flex items-center gap-1.5 text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors cursor-pointer font-semibold"
          title="Fit all milestones to canvas (Key: 0)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>
      </div>

      {/* Floating HUD: Bottom-Left Dynamic Coordinate Tracker */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-30 font-mono text-[11px] pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl theme-hud shadow-lg flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
            <span className="font-medium">Zoom: {Math.round(zoom * 100)}%</span>
          </span>
          {cursorYear !== null && (
            <>
              <span className="opacity-30">|</span>
              <span className="text-[#c9a84c] font-semibold">
                Cursor: {Math.abs(cursorYear).toLocaleString()} {cursorYear < 0 ? "BCE" : "CE"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

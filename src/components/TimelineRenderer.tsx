"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { layoutLabels, formatDateLabel, formatSpanLabel, TIER_SPACING, LayoutItem } from "@/lib/timeline-layout";
import { exportTimelineAsPng } from "@/components/PngExport";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Sparkles,
} from "lucide-react";

export interface LayerItem {
  id: string;
  name: string;
  color: string;
}

export interface EventData {
  id: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  endYear?: number | null;
  endIsBce?: boolean | null;
  endMonth?: number | null;
  endDay?: number | null;
  title: string;
  description: string | null;
  color: string;
  layer?: string | null;
}

export interface TimelineRendererHandle {
  fitAll: () => void;
  exportPng: (filename: string) => void;
}

interface TimelineRendererProps {
  timelineId?: string;
  events: EventData[];
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
  showGapBorder?: boolean;
  layers?: LayerItem[];
  activeLayerNames?: string[];
  showCanvasControls?: boolean;
  onToggleLayer?: (name: string) => void;
  onToggleAllLayers?: (all: boolean) => void;
  onIsolateLayer?: (name: string) => void;
  onCreateLayer?: (name: string, color: string) => Promise<LayerItem>;
  onDeleteLayer?: (id: string, name: string) => Promise<void> | void;
  onEventClick: (event: EventData) => void;
  onBgClick?: (year: number, isBce: boolean) => void;
}

const BASE_PIXELS_PER_YEAR = 0.05;
const MIN_ZOOM = 0.00001;
const MAX_ZOOM = 200;

const TICK_HEIGHT = 14;
const DOT_RADIUS = 5;

const PRESET_LAYER_COLORS = [
  "#c9a84c", // Imperial Gold
  "#38bdf8", // Sky Azure
  "#10b981", // Emerald
  "#f43f5e", // Crimson Rose
  "#a855f7", // Royal Purple
  "#f97316", // Amber Orange
  "#06b6d4", // Cyan
  "#f472b6", // Rose Quartz
];

const TimelineRenderer = forwardRef<TimelineRendererHandle, TimelineRendererProps>(
  function TimelineRenderer(
    {
      timelineId,
      events,
      bgColor,
      spineColor,
      textColor,
      showGapBorder = true,
      layers = [],
      activeLayerNames = [],
      showCanvasControls = true,
      onToggleLayer,
      onToggleAllLayers,
      onIsolateLayer,
      onCreateLayer,
      onDeleteLayer,
      onEventClick,
    },
    ref
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window !== "undefined") {
      return {
        width: window.innerWidth || 1200,
        height: Math.max(400, (window.innerHeight || 900) - 100),
      };
    }
    return { width: 1200, height: 800 };
  });

  // Load saved viewport state from localStorage so canvas always remembers screen position
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== "undefined" && timelineId) {
      try {
        const saved = localStorage.getItem(`neeline_viewport_${timelineId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.zoom === "number" && !isNaN(parsed.zoom)) {
            return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parsed.zoom));
          }
        }
      } catch {
        // fallback
      }
    }
    return 1;
  });

  const [panX, setPanX] = useState<number>(() => {
    if (typeof window !== "undefined" && timelineId) {
      try {
        const saved = localStorage.getItem(`neeline_viewport_${timelineId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.panX === "number" && !isNaN(parsed.panX)) {
            return parsed.panX;
          }
        }
      } catch {
        // fallback
      }
    }
    return 0;
  });

  const [layoutMode, setLayoutMode] = useState<"even" | "proportional">(() => {
    if (typeof window !== "undefined" && timelineId) {
      try {
        const saved = localStorage.getItem(`neeline_viewport_${timelineId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.layoutMode === "even" || parsed.layoutMode === "proportional") {
            return parsed.layoutMode;
          }
        }
      } catch {
        // fallback
      }
    }
    return "even";
  });

  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showGaps, setShowGaps] = useState(true);
  const [cursorYear, setCursorYear] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [selectedNoteEvent, setSelectedNoteEvent] = useState<LayoutItem | null>(null);

  // Layers Popover Menu state
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodColor, setNewPeriodColor] = useState("#38bdf8");
  const [showAddPeriodInput, setShowAddPeriodInput] = useState(false);
  const [creatingLayer, setCreatingLayer] = useState(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

  // Drag state
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Touch state
  const touchStart = useRef({ x: 0, y: 0 });
  const pinchDist = useRef<number | null>(null);

  // Resize observer with immediate measurement fallback and zero-collapse guard
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Immediately measure client rect to establish dimensions synchronously
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions((prev) => {
        if (Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Never allow zero or negative measurements to collapse the canvas
        if (width > 0 && height > 0) {
          setDimensions((prev) => {
            if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
              return prev;
            }
            return { width, height };
          });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close layers menu on outside click
  useEffect(() => {
    if (!showLayersMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (layersMenuRef.current && !layersMenuRef.current.contains(e.target as Node)) {
        setShowLayersMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showLayersMenu]);

  // Color lookup map for each layer (normalized case-insensitive)
  const layerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    layers.forEach((l) => {
      map.set(l.name, l.color);
      map.set(l.name.trim().toLowerCase(), l.color);
    });
    return map;
  }, [layers]);

  // Count events per layer (normalized case-insensitive)
  const layerEventCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((e) => {
      const lyr = ((e.layer && e.layer.trim()) || "General").toLowerCase();
      counts.set(lyr, (counts.get(lyr) || 0) + 1);
    });
    return counts;
  }, [events]);

  // Filter visible events based on active layers selection & assign layer colors
  const visibleEvents = useMemo(() => {
    if (events.length === 0) return [];
    const activeSet = new Set(activeLayerNames.map((n) => n.trim().toLowerCase()));

    const filtered = events.filter((e) => {
      const lyr = ((e.layer && e.layer.trim()) || "General").toLowerCase();
      return activeSet.has(lyr);
    });

    return filtered.map((e) => {
      const rawLyr = (e.layer && e.layer.trim()) || "General";
      const customColor =
        layerColorMap.get(rawLyr) ||
        layerColorMap.get(rawLyr.toLowerCase()) ||
        e.color;
      return {
        ...e,
        color: customColor,
      };
    });
  }, [events, activeLayerNames, layerColorMap]);

  // Unique chronological anchors across all VISIBLE point milestones and bracket span endpoints
  const chronologicalAnchors = useMemo(() => {
    const yearSet = new Set<number>();
    visibleEvents.forEach((e) => {
      yearSet.add(e.isBce ? -Math.abs(e.year) : e.year);
      if (e.endYear !== undefined && e.endYear !== null) {
        yearSet.add(e.endIsBce ? -Math.abs(e.endYear) : e.endYear);
      }
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [visibleEvents]);

  // Even-space base positions for all chronological anchors
  const anchorBasePositions = useMemo(() => {
    const map = new Map<number, number>();
    if (chronologicalAnchors.length === 0) return map;
    const SPACING = 220;
    const totalSpan = (chronologicalAnchors.length - 1) * SPACING;
    const start = -totalSpan / 2;
    chronologicalAnchors.forEach((y, i) => {
      map.set(y, start + i * SPACING);
    });
    return map;
  }, [chronologicalAnchors]);

  // Year-to-x mapping (supports both modes and all span anchors)
  const yearToX = useCallback(
    (year: number): number => {
      if (isNaN(year)) return dimensions.width / 2;
      if (layoutMode === "proportional") {
        return dimensions.width / 2 + year * BASE_PIXELS_PER_YEAR * zoom + panX;
      }
      if (chronologicalAnchors.length === 0) return dimensions.width / 2;

      // Exact match check
      const exactBase = anchorBasePositions.get(year);
      if (exactBase !== undefined) {
        return dimensions.width / 2 + exactBase * zoom + panX;
      }

      // If before first anchor or after last anchor
      const firstYear = chronologicalAnchors[0];
      const lastYear = chronologicalAnchors[chronologicalAnchors.length - 1];
      const firstX = dimensions.width / 2 + (anchorBasePositions.get(firstYear) ?? 0) * zoom + panX;
      const lastX = dimensions.width / 2 + (anchorBasePositions.get(lastYear) ?? 0) * zoom + panX;

      if (year <= firstYear) {
        return firstX + (year - firstYear) * BASE_PIXELS_PER_YEAR * zoom;
      }
      if (year >= lastYear) {
        return lastX + (year - lastYear) * BASE_PIXELS_PER_YEAR * zoom;
      }

      // Interpolate between surrounding anchors
      for (let i = 0; i < chronologicalAnchors.length - 1; i++) {
        const y0 = chronologicalAnchors[i];
        const y1 = chronologicalAnchors[i + 1];
        if (year >= y0 && year <= y1) {
          const x0 = dimensions.width / 2 + (anchorBasePositions.get(y0) ?? 0) * zoom + panX;
          const x1 = dimensions.width / 2 + (anchorBasePositions.get(y1) ?? 0) * zoom + panX;
          const denom = y1 - y0;
          const t = denom === 0 ? 0 : (year - y0) / denom;
          return x0 + t * (x1 - x0);
        }
      }
      return dimensions.width / 2;
    },
    [chronologicalAnchors, anchorBasePositions, layoutMode, zoom, panX, dimensions.width]
  );

  // X-to-year: inverse of yearToX
  const xToYear = useCallback(
    (x: number): number => {
      if (isNaN(x)) return 0;
      if (layoutMode === "proportional") {
        return (x - dimensions.width / 2 - panX) / (BASE_PIXELS_PER_YEAR * zoom);
      }
      if (chronologicalAnchors.length === 0) return 0;

      const anchorPoints = chronologicalAnchors.map((y) => ({
        year: y,
        x: dimensions.width / 2 + (anchorBasePositions.get(y) ?? 0) * zoom + panX,
      }));

      if (x <= anchorPoints[0].x) return anchorPoints[0].year;
      if (x >= anchorPoints[anchorPoints.length - 1].x) {
        return anchorPoints[anchorPoints.length - 1].year;
      }

      for (let i = 0; i < anchorPoints.length - 1; i++) {
        const p0 = anchorPoints[i];
        const p1 = anchorPoints[i + 1];
        if (x >= p0.x && x <= p1.x) {
          const denom = p1.x - p0.x;
          const t = denom === 0 ? 0 : (x - p0.x) / denom;
          return p0.year + t * (p1.year - p0.year);
        }
      }
      return 0;
    },
    [chronologicalAnchors, anchorBasePositions, layoutMode, zoom, panX, dimensions.width]
  );

  // Sorted events for gap calculation
  const sortedEvents = useMemo(() => {
    return [...visibleEvents].sort((a, b) => {
      const ya = a.isBce ? -Math.abs(a.year) : a.year;
      const yb = b.isBce ? -Math.abs(b.year) : b.year;
      return ya - yb;
    });
  }, [visibleEvents]);

  // Layout labels for visible events
  const layoutItems = useMemo(
    () => layoutLabels(visibleEvents, yearToX),
    [visibleEvents, yearToX]
  );

  // Unified Axis Date Markers (Deduplicated & Overlap-Suppressed)
  const axisDateMarkers = useMemo(() => {
    if (visibleEvents.length === 0) return [];

    interface RawMarker {
      key: string;
      x: number;
      year: number;
      isBce: boolean;
      month?: number | null;
      day?: number | null;
      color: string;
      label: string;
      isSpanAnchor: boolean;
    }

    const rawList: RawMarker[] = [];

    // 1. Collect all anchors from point milestones & bracket span endpoints
    layoutItems.forEach((item) => {
      if (!item.isSpan) {
        const effYear = item.isBce ? -Math.abs(item.year) : item.year;
        const key = `${effYear}_${item.month || 0}_${item.day || 0}`;
        rawList.push({
          key,
          x: item.x,
          year: item.year,
          isBce: item.isBce,
          month: item.month,
          day: item.day,
          color: item.color,
          label: formatDateLabel(item.year, item.isBce, item.month, item.day),
          isSpanAnchor: false,
        });
      } else {
        const rawX1 = item.startX !== undefined ? item.startX : yearToX(item.isBce ? -Math.abs(item.year) : item.year);
        const rawX2 = item.endX !== undefined ? item.endX : yearToX(item.endIsBce ? -Math.abs(item.endYear || item.year) : (item.endYear || item.year));

        const effStartYear = item.isBce ? -Math.abs(item.year) : item.year;
        const startKey = `${effStartYear}_${item.month || 0}_${item.day || 0}`;
        rawList.push({
          key: startKey,
          x: rawX1,
          year: item.year,
          isBce: item.isBce,
          month: item.month,
          day: item.day,
          color: item.color,
          label: formatDateLabel(item.year, item.isBce, item.month, item.day),
          isSpanAnchor: true,
        });

        const endYearVal = item.endYear ?? item.year;
        const endIsBceVal = item.endIsBce ?? item.isBce;
        const effEndYear = endIsBceVal ? -Math.abs(endYearVal) : endYearVal;
        const endKey = `${effEndYear}_${item.endMonth || 0}_${item.endDay || 0}`;
        rawList.push({
          key: endKey,
          x: rawX2,
          year: endYearVal,
          isBce: endIsBceVal,
          month: item.endMonth,
          day: item.endDay,
          color: item.color,
          label: formatDateLabel(endYearVal, endIsBceVal, item.endMonth, item.endDay),
          isSpanAnchor: true,
        });
      }
    });

    // 2. Deduplicate exact matching keys (same chronological coordinate)
    // If a point milestone and a span anchor coincide, prefer point milestone's color
    const map = new Map<string, RawMarker>();
    rawList.forEach((m) => {
      if (!map.has(m.key)) {
        map.set(m.key, m);
      } else {
        const existing = map.get(m.key)!;
        if (existing.isSpanAnchor && !m.isSpanAnchor) {
          map.set(m.key, m);
        }
      }
    });

    // 3. Sort unique markers by X position
    const sorted = Array.from(map.values()).sort((a, b) => a.x - b.x);

    // 4. Overlap & collision suppression:
    // Every unique anchor tick and dot node MUST remain on the axis spine so drop-lines always connect.
    // Date text labels beneath the axis are suppressed if they would collide horizontally!
    const result: (RawMarker & { showLabel: boolean })[] = [];
    let lastLabelX = -Infinity;
    const MIN_LABEL_GAP = 52; // minimum horizontal px between date text labels

    sorted.forEach((marker) => {
      const showLabel = marker.x - lastLabelX >= MIN_LABEL_GAP;
      if (showLabel) {
        lastLabelX = marker.x;
      }
      result.push({
        ...marker,
        showLabel,
      });
    });

    return result;
  }, [visibleEvents, layoutItems, yearToX]);

  // Compute spine extents strictly bounded by earliest and latest event points of active visible events
  const hasEvents = visibleEvents.length > 0;
  const [spineLeft, spineRight] = useMemo(() => {
    if (!hasEvents || chronologicalAnchors.length === 0) {
      const mid = dimensions.width / 2;
      return [mid - 150, mid + 150];
    }
    const minAnchorX = yearToX(chronologicalAnchors[0]);
    const maxAnchorX = yearToX(chronologicalAnchors[chronologicalAnchors.length - 1]);
    const PADDING = 60; // Clean margin beyond extreme event anchors
    return [Math.min(minAnchorX, maxAnchorX) - PADDING, Math.max(minAnchorX, maxAnchorX) + PADDING];
  }, [hasEvents, chronologicalAnchors, yearToX, dimensions.width]);

  const spineY = dimensions.height / 2;
  const originX = yearToX(0);

  // Explicit Fit View Calculation for any layout mode:
  // Strictly executed ONLY on the 3 designated triggers:
  // 1. When fit button is clicked
  // 2. When user first time logged in and opens canvas (first time opening timeline in browser)
  // 3. When Even Space or Proportional button is clicked
  const fitViewForMode = useCallback(
    (targetMode: "even" | "proportional") => {
      if (visibleEvents.length === 0) return;

      if (targetMode === "proportional") {
        const years = visibleEvents.map((e) => (e.isBce ? -Math.abs(e.year) : e.year));
        visibleEvents.forEach((e) => {
          if (e.endYear !== undefined && e.endYear !== null) {
            years.push(e.endIsBce ? -Math.abs(e.endYear) : e.endYear);
          }
        });
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const range = maxYear - minYear;
        const padding = 100;
        const availableWidth = Math.max(200, dimensions.width - padding * 2);

        if (range <= 0) {
          setZoom(1);
          setPanX(-minYear * BASE_PIXELS_PER_YEAR);
          prevLayoutStateRef.current.panX = -minYear * BASE_PIXELS_PER_YEAR;
          prevLayoutStateRef.current.zoom = 1;
          return;
        }

        const calculatedZoom = availableWidth / (range * BASE_PIXELS_PER_YEAR);
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
        setZoom(clampedZoom);

        const centerX = (minYear + maxYear) / 2;
        const targetPan = -centerX * BASE_PIXELS_PER_YEAR * clampedZoom;
        setPanX(targetPan);
        prevLayoutStateRef.current.panX = targetPan;
        prevLayoutStateRef.current.zoom = clampedZoom;
        return;
      }

      // Even Space mode: frame all active anchors evenly spaced
      const SPACING = 220;
      const count = Math.max(1, chronologicalAnchors.length);
      const totalSpan = Math.max(1, count - 1) * SPACING;
      const padding = 140;
      const availableWidth = Math.max(200, dimensions.width - padding * 2);
      const calculatedZoom = count > 1 ? Math.min(1.25, availableWidth / totalSpan) : 1;
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
      setZoom(clampedZoom);
      setPanX(0);
      prevLayoutStateRef.current.panX = 0;
      prevLayoutStateRef.current.zoom = clampedZoom;
    },
    [visibleEvents, chronologicalAnchors, dimensions.width]
  );

  const fitAll = useCallback(() => {
    fitViewForMode(layoutMode);
  }, [fitViewForMode, layoutMode]);

  // Stable tracking of layout geometry across renders for synchronous focal stability
  const prevLayoutStateRef = useRef<{
    anchorBasePositions: Map<number, number>;
    panX: number;
    zoom: number;
    width: number;
    layoutMode: "even" | "proportional";
    hasInitialized: boolean;
  }>({
    anchorBasePositions: new Map(),
    panX,
    zoom,
    width: dimensions.width,
    layoutMode,
    hasInitialized: false,
  });

  const hasCheckedInitialFit = useRef(false);
  const lastTimelineIdRef = useRef<string | null>(timelineId || null);

  // If active timeline changes (SPA navigation between timelines), reset initialization flags
  if (lastTimelineIdRef.current !== (timelineId || null)) {
    lastTimelineIdRef.current = timelineId || null;
    hasCheckedInitialFit.current = false;
    prevLayoutStateRef.current.hasInitialized = false;
    prevLayoutStateRef.current.anchorBasePositions = new Map();
  }

  // Keep ref synchronized with user interactive pan/zoom updates
  useEffect(() => {
    prevLayoutStateRef.current.panX = panX;
    prevLayoutStateRef.current.zoom = zoom;
    prevLayoutStateRef.current.width = dimensions.width;
    prevLayoutStateRef.current.layoutMode = layoutMode;
  }, [panX, zoom, dimensions.width, layoutMode]);

  // Synchronous Render-Phase Focal Alignment on layer toggle / milestone add or delete:
  // Preserves the reading position of the milestone nearest to screen center with ZERO flicker.
  // CRUCIAL: Layer add/remove NEVER triggers fit view!
  if (
    prevLayoutStateRef.current.hasInitialized &&
    layoutMode === "even" &&
    prevLayoutStateRef.current.layoutMode === "even" &&
    prevLayoutStateRef.current.anchorBasePositions !== anchorBasePositions
  ) {
    const prevState = prevLayoutStateRef.current;
    const commonYears: number[] = [];
    anchorBasePositions.forEach((_, year) => {
      if (prevState.anchorBasePositions.has(year)) {
        commonYears.push(year);
      }
    });

    if (commonYears.length > 0) {
      const centerScreenX = prevState.width / 2;
      let bestYear = commonYears[0];
      let minDistanceToCenter = Infinity;

      commonYears.forEach((y) => {
        const prevBaseX = prevState.anchorBasePositions.get(y)!;
        const prevScreenX = centerScreenX + prevBaseX * prevState.zoom + prevState.panX;
        const dist = Math.abs(prevScreenX - centerScreenX);
        if (dist < minDistanceToCenter) {
          minDistanceToCenter = dist;
          bestYear = y;
        }
      });

      const prevBaseX = prevState.anchorBasePositions.get(bestYear)!;
      const prevScreenX = centerScreenX + prevBaseX * prevState.zoom + prevState.panX;

      const newBaseX = anchorBasePositions.get(bestYear)!;
      const targetScreenX = dimensions.width / 2;
      const targetPanX = prevScreenX - targetScreenX - newBaseX * zoom;

      if (Math.abs(targetPanX - panX) > 0.5) {
        setPanX(targetPanX);
        prevLayoutStateRef.current.panX = targetPanX;
      }
    } else if (chronologicalAnchors.length > 0) {
      // Switched to a completely disjoint layer with 0 common events: center new layer
      const SPACING = 220;
      const totalSpan = Math.max(1, chronologicalAnchors.length - 1) * SPACING;
      const padding = 140;
      const availableWidth = dimensions.width - padding * 2;
      const newZoom = chronologicalAnchors.length > 1 ? Math.min(1.25, availableWidth / totalSpan) : 1;
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoom(clampedZoom);
      setPanX(0);
      prevLayoutStateRef.current.panX = 0;
      prevLayoutStateRef.current.zoom = clampedZoom;
    }

    prevLayoutStateRef.current.anchorBasePositions = anchorBasePositions;
    prevLayoutStateRef.current.width = dimensions.width;
    prevLayoutStateRef.current.zoom = zoom;
    prevLayoutStateRef.current.layoutMode = layoutMode;
  } else if (!prevLayoutStateRef.current.hasInitialized && anchorBasePositions.size > 0) {
    // Initial data load: lock initial anchor state without modifying panX or calling fit
    prevLayoutStateRef.current = {
      anchorBasePositions,
      panX,
      zoom,
      width: dimensions.width,
      layoutMode,
      hasInitialized: true,
    };
  }

  // Trigger 3: Clicking Even Space or Proportional button puts all events/layers into fit view
  const handleSetLayoutMode = useCallback(
    (newMode: "even" | "proportional") => {
      setLayoutMode(newMode);
      fitViewForMode(newMode);
    },
    [fitViewForMode]
  );

  // Trigger 1: Manual Fit button click handler
  const handleFitClick = useCallback(() => {
    fitViewForMode(layoutMode);
  }, [fitViewForMode, layoutMode]);

  // Export full timeline fitted as 2x Retina PNG
  const exportPng = useCallback(
    (filename: string) => {
      const currentZoom = zoom;
      const currentPanX = panX;
      fitAll();
      setTimeout(() => {
        const svgEl = document.getElementById("timeline-canvas-svg") as SVGSVGElement | null;
        if (svgEl) {
          exportTimelineAsPng(svgEl, bgColor, filename);
        }
        // Restore user's exact zoom and pan position after export snapshot
        setZoom(currentZoom);
        setPanX(currentPanX);
      }, 160);
    },
    [fitAll, bgColor, zoom, panX]
  );

  useImperativeHandle(ref, () => ({
    fitAll,
    exportPng,
  }));

  // Synchronize viewport state when timelineId changes
  useEffect(() => {
    if (!timelineId || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`neeline_viewport_${timelineId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.zoom === "number" && !isNaN(parsed.zoom)) {
          setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parsed.zoom)));
        }
        if (typeof parsed.panX === "number" && !isNaN(parsed.panX)) {
          setPanX(parsed.panX);
        }
        if (parsed.layoutMode === "even" || parsed.layoutMode === "proportional") {
          setLayoutMode(parsed.layoutMode);
        }
      }
    } catch {
      // ignore
    }
  }, [timelineId]);

  // Persist user's viewport (zoom, pan, layoutMode) to localStorage on every change
  useEffect(() => {
    if (!timelineId || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `neeline_viewport_${timelineId}`,
        JSON.stringify({ zoom, panX, layoutMode })
      );
    } catch {
      // ignore
    }
  }, [timelineId, zoom, panX, layoutMode]);

  // Trigger 2: One-time initial fit ONLY if this timeline has never been viewed before in this browser
  useEffect(() => {
    if (hasCheckedInitialFit.current || !timelineId || typeof window === "undefined") return;
    if (visibleEvents.length === 0) return;

    hasCheckedInitialFit.current = true;
    try {
      const saved = localStorage.getItem(`neeline_viewport_${timelineId}`);
      if (!saved) {
        fitViewForMode(layoutMode);
      }
    } catch {
      // ignore
    }
  }, [timelineId, visibleEvents.length, fitViewForMode, layoutMode]);

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

  // SVG Canvas Click: Deselects / closes popovers.
  // Crucially: Clicking empty canvas DOES NOT open the Add Milestone modal.
  const handleSvgClick = useCallback(() => {
    if (hasDragged.current) return;
    setShowLayersMenu(false);
    setHoveredEvent(null);
    setSelectedNoteEvent(null);
  }, []);

  // Zoom In / Zoom Out functions (Centered on user's current screen center)
  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, z * 1.25);
      const ratio = next / z;
      setPanX((p) => p * ratio);
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z / 1.25);
      const ratio = next / z;
      setPanX((p) => p * ratio);
      return next;
    });
  }, []);

  // Quick Layer Creation inside popover
  async function handleCreatePeriod() {
    const trimmed = newPeriodName.trim();
    if (!trimmed || !onCreateLayer) return;
    setCreatingLayer(true);
    try {
      await onCreateLayer(trimmed, newPeriodColor);
      setNewPeriodName("");
      setShowAddPeriodInput(false);
    } finally {
      setCreatingLayer(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "0") {
        handleFitClick();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-") {
        zoomOut();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleFitClick, zoomIn, zoomOut]);

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
        id="timeline-canvas-svg"
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

        {/* The Golden Spine Axis line (strictly bounded to event points) */}
        <line
          x1={spineLeft}
          y1={spineY}
          x2={spineRight}
          y2={spineY}
          stroke={spineColor}
          strokeWidth="2.5"
          opacity="0.85"
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
        {/* Terminal endpoint caps on the spine axis */}
        <circle cx={spineLeft} cy={spineY} r="3" fill={spineColor} opacity="0.85" />
        <circle cx={spineRight} cy={spineY} r="3" fill={spineColor} opacity="0.85" />

        {/* Permanent Year 0 Landmark Axis Marker: Permanent as "0" with thick solid red border */}
        {originX >= spineLeft && originX <= spineRight && (
          <g className="origin-marker-0" style={{ cursor: "default" }}>
            {/* Vertical tick through axis - thick solid red */}
            <line
              x1={originX}
              y1={spineY - TICK_HEIGHT - 4}
              x2={originX}
              y2={spineY + TICK_HEIGHT + 4}
              stroke="#ef4444"
              strokeWidth="3"
              opacity="1"
            />
            {/* Center solid red core node */}
            <circle cx={originX} cy={spineY} r="4" fill="#ef4444" />

            {/* Permanent "0" Badge with THICK SOLID RED BORDER */}
            <rect
              x={originX - 16}
              y={spineY + TICK_HEIGHT + 8}
              width="32"
              height="22"
              rx="5"
              fill={bgColor}
              stroke="#ef4444"
              strokeWidth="2.8"
              opacity="1"
            />
            <text
              x={originX}
              y={spineY + TICK_HEIGHT + 23}
              textAnchor="middle"
              fill="#ef4444"
              fontSize="12"
              fontWeight="800"
              fontFamily="var(--font-mono, monospace)"
            >
              0
            </text>
          </g>
        )}

        {hasEvents && (
          <>
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

            {/* Unified Axis Ticks, Nodes & Date Labels (Deduplicated & Overlap-Free) */}
            <g className="spine-ticks-and-labels">
              {axisDateMarkers.map((marker) => {
                const isZero = marker.year === 0;
                return (
                  <g key={`axis-${marker.key}`} className="axis-point-group">
                    {/* Vertical tick on axis */}
                    <line
                      x1={marker.x}
                      y1={spineY - TICK_HEIGHT / 2 - (isZero ? 2 : 0)}
                      x2={marker.x}
                      y2={spineY + TICK_HEIGHT / 2 + (isZero ? 2 : 0)}
                      stroke={isZero ? "#ef4444" : marker.color}
                      strokeWidth={isZero ? "3" : "2.5"}
                      opacity="0.95"
                    />

                    {/* Spine dot node */}
                    <circle
                      cx={marker.x}
                      cy={spineY}
                      r={isZero ? "4.5" : "3.5"}
                      fill={isZero ? "#ef4444" : marker.color}
                      stroke={isZero ? "#ef4444" : bgColor}
                      strokeWidth="1.5"
                    />

                    {/* Single date label beneath the axis (shown when not colliding) */}
                    {marker.showLabel && (
                      <text
                        x={marker.x}
                        y={spineY + TICK_HEIGHT / 2 + 16}
                        textAnchor="middle"
                        fill={isZero ? "#ef4444" : marker.color}
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        fontWeight={isZero ? "800" : "500"}
                        opacity="0.95"
                      >
                        {isZero ? "0" : marker.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Event cards, brackets, and connectors */}
            {layoutItems.map((item) => {
              if (item.isSpan) {
                const rawX1 = item.startX !== undefined ? item.startX : yearToX(item.isBce ? -Math.abs(item.year) : item.year);
                const rawX2 = item.endX !== undefined ? item.endX : yearToX(item.endIsBce ? -Math.abs(item.endYear || item.year) : (item.endYear || item.year));
                const x1 = Math.min(rawX1, rawX2);
                const x2 = Math.max(rawX1, rawX2);
                const centerX = (x1 + x2) / 2;
                // Position bracket spans cleanly above all point milestone card tiers (max tier 3 reaches spineY - 129)
                const bracketY = spineY - 142 - (item.bracketTier || 0) * 42;
                const labelW = Math.max(90, item.labelWidth);

                return (
                  <g key={item.eventId} className="bracket-period-group">
                    {/* Projection drop-lines down to the golden spine */}
                    <line
                      x1={x1}
                      y1={bracketY + 12}
                      x2={x1}
                      y2={spineY}
                      stroke={item.color}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.45"
                    />
                    <line
                      x1={x2}
                      y1={bracketY + 12}
                      x2={x2}
                      y2={spineY}
                      stroke={item.color}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.45"
                    />

                    {/* Horizontal Square Bracket Outline */}
                    {/* Continuous horizontal top crossbar */}
                    <line
                      x1={x1}
                      y1={bracketY}
                      x2={x2}
                      y2={bracketY}
                      stroke={item.color}
                      strokeWidth="2.5"
                      opacity="0.95"
                    />
                    {/* Left vertical cap */}
                    <line
                      x1={x1}
                      y1={bracketY}
                      x2={x1}
                      y2={bracketY + 12}
                      stroke={item.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    {/* Right vertical cap */}
                    <line
                      x1={x2}
                      y1={bracketY}
                      x2={x2}
                      y2={bracketY + 12}
                      stroke={item.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.95"
                    />

                    {/* Center Label Card */}
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
                            endYear: item.endYear,
                            endIsBce: item.endIsBce,
                            endMonth: item.endMonth,
                            endDay: item.endDay,
                            title: item.title,
                            description: item.description,
                            color: item.color,
                            layer: item.layer,
                          });
                        }
                      }}
                    >
                      <rect
                        x={centerX - labelW / 2}
                        y={bracketY - 13}
                        width={labelW}
                        height="26"
                        rx="6"
                        fill={bgColor}
                        stroke={item.year === 0 || item.endYear === 0 ? "#ef4444" : item.color}
                        strokeWidth={item.year === 0 || item.endYear === 0 ? "3" : "1.8"}
                        opacity="0.98"
                      />
                      <text
                        x={item.description ? centerX - 8 : centerX}
                        y={bracketY + 4}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize="12"
                        fontFamily="var(--font-display)"
                        fontWeight="600"
                      >
                        {item.title}
                      </text>

                      {/* Chronicle Notes Mechanism on Center Label (Clean, Stable SVG, No Flickering Box) */}
                      {item.description && (
                        <g
                          className="cursor-pointer group/note"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNoteEvent(item);
                          }}
                        >
                          <title>View Chronicle Notes</title>
                          {/* Invisible hit-box rect for reliable clicking without any visual shape box or flickering */}
                          <rect
                            x={centerX + labelW / 2 - 22}
                            y={bracketY - 11}
                            width="20"
                            height="22"
                            fill="transparent"
                          />
                          <svg
                            x={centerX + labelW / 2 - 18}
                            y={bracketY - 6}
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={item.color}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-none opacity-80 group-hover/note:opacity-100 transition-opacity"
                          >
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                        </g>
                      )}
                    </g>
                  </g>
                );
              }

              // Standard Point Milestone
              return (
                <g key={item.eventId} className="event-group">
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
                            endYear: null,
                            endIsBce: null,
                            endMonth: null,
                            endDay: null,
                            title: item.title,
                            description: item.description,
                            color: item.color,
                            layer: item.layer,
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
                    // Full Label Card with Layer's Unique Line & Border Color
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
                            endYear: null,
                            endIsBce: null,
                            endMonth: null,
                            endDay: null,
                            title: item.title,
                            description: item.description,
                            color: item.color,
                            layer: item.layer,
                          });
                        }
                      }}
                    >
                      {/* Connector line with layer color (red if Year 0) */}
                      <line
                        x1={item.x}
                        y1={spineY - TICK_HEIGHT / 2}
                        x2={item.x}
                        y2={spineY - TICK_HEIGHT / 2 - 8 - item.tier * TIER_SPACING}
                        stroke={item.year === 0 ? "#ef4444" : item.color}
                        strokeWidth={item.year === 0 ? "2.5" : "1.5"}
                        opacity="0.9"
                      />

                      {/* Card background with layer's unique border color (thick solid red if Year 0) */}
                      <rect
                        x={item.x - item.labelWidth / 2}
                        y={spineY - TICK_HEIGHT / 2 - 26 - item.tier * TIER_SPACING}
                        width={item.labelWidth}
                        height="24"
                        rx="6"
                        fill={bgColor}
                        stroke={item.year === 0 ? "#ef4444" : item.color}
                        strokeWidth={item.year === 0 ? "3" : "1.8"}
                        opacity="0.98"
                      />

                      {/* Event Title */}
                      <text
                        x={item.description ? item.x - 7 : item.x}
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

                      {/* Chronicle Notes Icon Button on Point Milestone (Clean, Stable SVG, No Flickering Box) */}
                      {item.description && (
                        <g
                          className="cursor-pointer group/note"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNoteEvent(item);
                          }}
                        >
                          <title>View Chronicle Notes</title>
                          {/* Invisible hit-box rect for reliable clicking without any visual shape box or flickering */}
                          <rect
                            x={item.x + item.labelWidth / 2 - 22}
                            y={spineY - TICK_HEIGHT / 2 - 25 - item.tier * TIER_SPACING}
                            width="20"
                            height="22"
                            fill="transparent"
                          />
                          <svg
                            x={item.x + item.labelWidth / 2 - 18}
                            y={spineY - TICK_HEIGHT / 2 - 20 - item.tier * TIER_SPACING}
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={item.color}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-none opacity-80 group-hover/note:opacity-100 transition-opacity"
                          >
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {/* Interactive Hairline Mouse Cursor Guide */}
            {cursorX !== null && cursorYear !== null && !isDragging.current && (
              <g className="cursor-guide pointer-events-none">
                <line
                  x1={cursorX}
                  y1={0}
                  x2={cursorX}
                  y2={dimensions.height}
                  stroke={spineColor}
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  opacity="0.25"
                />
              </g>
            )}
          </>
        )}

        {/* Empty State when no visible events */}
        {!hasEvents && (
          <g className="empty-state select-none">
            <line
              x1={dimensions.width * 0.15}
              y1={dimensions.height / 2}
              x2={dimensions.width * 0.85}
              y2={dimensions.height / 2}
              stroke={spineColor}
              strokeWidth="2"
              opacity="0.3"
              strokeDasharray="6 6"
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
              y={dimensions.height / 2 - 25}
              textAnchor="middle"
              fill={textColor}
              fontSize="16"
              fontFamily="var(--font-display)"
              fontWeight="600"
              opacity="0.85"
            >
              {events.length === 0
                ? "Empty Chronicle Axis"
                : "No Milestones Visible in Selected Layers"}
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
              {events.length === 0
                ? "Press + Add Event in the studio bar above to plot milestones"
                : "Enable layers from the [Layers] button above to view events"}
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

      {/* Chronicle Notes Floating Popover Inspector */}
      {selectedNoteEvent && (
        <div
          className="absolute z-50 p-4 rounded-2xl glass-panel shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-black/10 dark:border-white/[0.14] max-w-sm w-full animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(
              Math.max(16, selectedNoteEvent.x - 140),
              Math.max(16, dimensions.width - 340)
            ),
            top: Math.max(16, Math.min(spineY - 210, dimensions.height - 260)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-black/[0.08] dark:border-white/[0.08]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedNoteEvent.color }}
                />
                <span className="text-[10px] font-mono font-semibold" style={{ color: selectedNoteEvent.color }}>
                  {selectedNoteEvent.layer || "General"}
                </span>
                <span className="text-[10px] font-mono theme-text-muted">
                  • {selectedNoteEvent.isSpan ? "Horizontal Bracket" : "Point Milestone"}
                </span>
              </div>
              <h4
                className="text-sm font-bold theme-card-title truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {selectedNoteEvent.title}
              </h4>
              <div className="text-[10.5px] font-mono text-[#c9a84c] font-medium mt-0.5">
                {selectedNoteEvent.isSpan
                  ? formatSpanLabel(
                      selectedNoteEvent.year,
                      selectedNoteEvent.isBce,
                      selectedNoteEvent.endYear || selectedNoteEvent.year,
                      selectedNoteEvent.endIsBce || false
                    )
                  : formatDateLabel(
                      selectedNoteEvent.year,
                      selectedNoteEvent.isBce,
                      selectedNoteEvent.month,
                      selectedNoteEvent.day
                    )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNoteEvent(null)}
              className="w-6 h-6 flex items-center justify-center rounded-lg theme-text-muted hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Close Notes"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Notes Body */}
          <div className="text-xs leading-relaxed max-h-48 overflow-y-auto font-sans font-light theme-card-title whitespace-pre-wrap pr-1 selection:bg-[#c9a84c]/30">
            {selectedNoteEvent.description ? (
              selectedNoteEvent.description
            ) : (
              <span className="text-xs font-mono theme-text-muted italic">
                No chronicle notes recorded for this milestone. Click &quot;Edit in Studio&quot; to add notes.
              </span>
            )}
          </div>

          {/* Popover Footer with Edit in Studio Button */}
          <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-mono theme-text-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              <span>Chronicle Record</span>
            </span>

            <button
              type="button"
              onClick={() => {
                const ev = selectedNoteEvent;
                setSelectedNoteEvent(null);
                onEventClick({
                  id: ev.eventId,
                  year: ev.year,
                  isBce: ev.isBce,
                  month: ev.month,
                  day: ev.day,
                  endYear: ev.isSpan ? (ev.endYear ?? null) : null,
                  endIsBce: ev.isSpan ? (ev.endIsBce ?? null) : null,
                  endMonth: ev.isSpan ? (ev.endMonth ?? null) : null,
                  endDay: ev.isSpan ? (ev.endDay ?? null) : null,
                  title: ev.title,
                  description: ev.description,
                  color: ev.color,
                  layer: ev.layer,
                });
              }}
              className="text-[10px] font-mono font-semibold text-[#c9a84c] hover:underline cursor-pointer"
            >
              Edit in Studio →
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD: Top-Right Canvas Controls */}
      <div
        className={`absolute top-3 right-4 flex items-center gap-2 z-30 transition-all duration-200 ease-out ${
          showCanvasControls
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
      >
        {/* Layout Mode Segmented Toggle */}
        <div className="flex items-center p-1 rounded-xl theme-hud text-[11px] font-mono shadow-lg">
          <button
            onClick={() => handleSetLayoutMode("even")}
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
            onClick={() => handleSetLayoutMode("proportional")}
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

        {/* Layers / Historical Periods Button (Beside Gaps button) */}
        <div className="relative" ref={layersMenuRef}>
          <button
            onClick={() => setShowLayersMenu((v) => !v)}
            className={`h-8 px-3 rounded-xl theme-hud text-[11px] font-mono flex items-center gap-2 transition-all cursor-pointer ${
              showLayersMenu || (layers.length > 0 && activeLayerNames.length < layers.length)
                ? "border-[#c9a84c]/50 text-[#c9a84c] bg-[#c9a84c]/15 font-semibold shadow-md"
                : "theme-hud-btn"
            }`}
            title="Manage and toggle historical period layers"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-bold">
              {activeLayerNames.length}/{layers.length || 1}
            </span>
          </button>

          {/* Floating Layers Popover Dock */}
          {showLayersMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl glass-panel p-3 shadow-2xl z-50 border border-black/10 dark:border-white/[0.1] animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.08] dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span className="text-xs font-bold font-mono theme-card-title">
                    Historical Periods
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => onToggleAllLayers && onToggleAllLayers(true)}
                    className="px-1.5 py-0.5 rounded text-[#c9a84c] hover:bg-[#c9a84c]/10 cursor-pointer font-medium"
                    title="Select all layers"
                  >
                    All
                  </button>
                  <span className="opacity-30">|</span>
                  <button
                    type="button"
                    onClick={() => onToggleAllLayers && onToggleAllLayers(false)}
                    className="px-1.5 py-0.5 rounded theme-text-muted hover:opacity-100 cursor-pointer"
                    title="Deselect all layers"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Layer Checkbox List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {layers.map((layer) => {
                  const normalizedLayerName = layer.name.trim().toLowerCase();
                  const isActive = activeLayerNames.some(
                    (n) => n.trim().toLowerCase() === normalizedLayerName
                  );
                  const count =
                    layerEventCounts.get(normalizedLayerName) ??
                    layerEventCounts.get(layer.name) ??
                    0;

                  return (
                    <div
                      key={layer.id || layer.name}
                      className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer group ${
                        isActive
                          ? "bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10"
                          : "opacity-60 hover:opacity-100 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      }`}
                      onClick={() => onToggleLayer && onToggleLayer(layer.name)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isActive ? (
                          <CheckSquare
                            className="w-4 h-4 shrink-0 transition-transform active:scale-90"
                            style={{ color: layer.color }}
                          />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 opacity-40" />
                        )}

                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: layer.color }}
                        />

                        <span
                          className={`text-xs truncate font-mono ${
                            isActive ? "font-semibold theme-card-title" : "theme-text-muted"
                          }`}
                        >
                          {layer.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1-click Isolate Layer */}
                        {onIsolateLayer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onIsolateLayer(layer.name);
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#c9a84c]/20 text-[#c9a84c] transition-all cursor-pointer font-medium"
                            title={`Isolate ${layer.name} layer (hide all other layers)`}
                          >
                            Only
                          </button>
                        )}

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 opacity-70">
                          {count}
                        </span>

                        {onDeleteLayer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLayer(layer.id, layer.name);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-500 rounded transition-opacity cursor-pointer"
                            title={`Permanently delete ${layer.name} layer and all its events`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Period Section */}
              <div className="mt-2.5 pt-2.5 border-t border-black/[0.08] dark:border-white/[0.08]">
                {showAddPeriodInput ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newPeriodName}
                        onChange={(e) => setNewPeriodName(e.target.value)}
                        placeholder="Period name (e.g. Bronze Age)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg theme-input text-xs font-mono outline-none focus:ring-1 focus:ring-[#c9a84c]"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={newPeriodColor}
                        onChange={(e) => setNewPeriodColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer p-0.5 bg-transparent border border-black/15 dark:border-white/15 shrink-0"
                        title="Period Color"
                      />
                    </div>

                    {/* Quick color preset swatches */}
                    <div className="flex items-center gap-1.5 py-1.5 px-0.5 overflow-x-auto">
                      {PRESET_LAYER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewPeriodColor(c)}
                          className={`w-4 h-4 rounded-full shrink-0 transition-all cursor-pointer ${
                            newPeriodColor === c ? "ring-2 ring-[#c9a84c] ring-offset-1 ring-offset-white dark:ring-offset-[#131c2e]" : "hover:opacity-100 opacity-70"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => setShowAddPeriodInput(false)}
                        className="px-2.5 py-1 rounded-lg theme-pill text-[11px] font-mono cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreatePeriod}
                        disabled={creatingLayer || !newPeriodName.trim()}
                        className="btn-gold px-3 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {creatingLayer ? "Adding..." : "Add Layer"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddPeriodInput(true)}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-mono text-[#c9a84c] hover:bg-[#c9a84c]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Period / Layer</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating HUD: Bottom-Right Zoom & Fit Dock */}
      <div
        className={`absolute bottom-3 right-4 flex items-center gap-1.5 p-1 rounded-xl theme-hud shadow-2xl z-30 font-mono text-xs transition-all duration-200 ease-out ${
          showCanvasControls
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
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
          onClick={handleFitClick}
          className="px-2.5 h-8 rounded-lg flex items-center gap-1.5 text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-colors cursor-pointer font-semibold"
          title="Fit all milestones to canvas (Key: 0)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>
      </div>

      {/* Floating HUD: Bottom-Left Dynamic Coordinate Tracker */}
      <div
        className={`absolute bottom-3 left-4 flex items-center gap-2 z-30 font-mono text-[11px] pointer-events-none transition-all duration-200 ease-out ${
          showCanvasControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3"
        }`}
      >
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
});

export default TimelineRenderer;

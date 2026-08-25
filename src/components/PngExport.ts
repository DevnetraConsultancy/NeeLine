/**
 * Exports the visible SVG timeline as a PNG by reading computed styles
 * from the live DOM and drawing directly onto Canvas 2D.
 * This avoids SVG→Image serialization issues with fonts and CSS variables.
 */
export function exportTimelineAsPng(
  svgEl: SVGSVGElement,
  bgColor: string,
  filename: string
) {
  const width = svgEl.clientWidth || svgEl.getBoundingClientRect().width;
  const height = svgEl.clientHeight || svgEl.getBoundingClientRect().height;
  if (width === 0 || height === 0) return;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const context = ctx;

  context.scale(scale, scale);

  // Fill background
  context.fillStyle = bgColor;
  context.fillRect(0, 0, width, height);

  // Draw each SVG element by reading computed styles from the live DOM
  const svgRect = svgEl.getBoundingClientRect();

  // Process all children of the SVG (lines, circles, rects, text, groups)
  function drawElement(el: SVGElement) {
    const computed = window.getComputedStyle(el);
    const tag = el.tagName.toLowerCase();

    // Skip invisible elements
    if (computed.display === "none" || computed.visibility === "hidden") return;

    const opacity = parseFloat(computed.opacity) || 1;
    context.globalAlpha = opacity;

    if (tag === "line") {
      const x1 = parseFloat(el.getAttribute("x1") || "0");
      const y1 = parseFloat(el.getAttribute("y1") || "0");
      const x2 = parseFloat(el.getAttribute("x2") || "0");
      const y2 = parseFloat(el.getAttribute("y2") || "0");
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = computed.stroke || el.getAttribute("stroke") || "#000";
      context.lineWidth = parseFloat(computed.strokeWidth) || parseFloat(el.getAttribute("stroke-width") || "1");
      const dashArray = el.getAttribute("stroke-dasharray");
      if (dashArray) {
        context.setLineDash(dashArray.split(/[,\s]+/).map(Number));
      } else {
        context.setLineDash([]);
      }
      context.stroke();
      context.setLineDash([]);
    } else if (tag === "circle") {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const r = parseFloat(el.getAttribute("r") || "0");
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      const fill = computed.fill || el.getAttribute("fill") || "none";
      const stroke = computed.stroke || el.getAttribute("stroke") || "none";
      if (fill && fill !== "none") {
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke && stroke !== "none") {
        context.strokeStyle = stroke;
        context.lineWidth = parseFloat(el.getAttribute("stroke-width") || "1");
        context.stroke();
      }
    } else if (tag === "rect") {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      const rx = parseFloat(el.getAttribute("rx") || "0");
      if (rx > 0) {
        context.beginPath();
        context.roundRect(x, y, w, h, rx);
      } else {
        context.beginPath();
        context.rect(x, y, w, h);
      }
      const fill = computed.fill || el.getAttribute("fill") || "none";
      const stroke = computed.stroke || el.getAttribute("stroke") || "none";
      if (fill && fill !== "none") {
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke && stroke !== "none") {
        context.strokeStyle = stroke;
        context.lineWidth = parseFloat(el.getAttribute("stroke-width") || "1");
        context.stroke();
      }
    } else if (tag === "text") {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const textContent = el.textContent || "";
      if (!textContent) return;

      const fontFamily = computed.fontFamily || "sans-serif";
      const fontSize = computed.fontSize || "12px";
      const fontWeight = computed.fontWeight || "normal";
      const fill = computed.fill || el.getAttribute("fill") || "#000";
      const textAnchor = el.getAttribute("text-anchor") || "start";

      context.fillStyle = fill;
      context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
      context.textBaseline = "alphabetic";

      let tx = x;
      if (textAnchor === "middle") {
        context.textAlign = "center";
        tx = x;
      } else if (textAnchor === "end") {
        context.textAlign = "right";
        tx = x;
      } else {
        context.textAlign = "left";
        tx = x;
      }

      context.fillText(textContent, tx, y);
    } else if (tag === "g") {
      // Recurse into group children
      Array.from(el.children).forEach((child) => {
        if (child instanceof SVGElement) {
          drawElement(child);
        }
      });
    }

    context.globalAlpha = 1;
  }

  // Draw all direct children of the SVG
  Array.from(svgEl.children).forEach((child) => {
    if (child instanceof SVGElement) {
      drawElement(child);
    }
  });

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * Exports timeline events as a TXT file with 3 columns: Year, Title, Description
 */
export function exportTimelineAsTxt(
  events: Array<{
    year: number;
    isBce: boolean;
    title: string;
    description: string | null;
    month: number | null;
    day: number | null;
  }>,
  filename: string
) {
  // Sort chronologically
  const sorted = [...events].sort((a, b) => {
    const ya = a.isBce ? -Math.abs(a.year) : a.year;
    const yb = b.isBce ? -Math.abs(b.year) : b.year;
    return ya - yb;
  });

  const formatYear = (year: number, isBce: boolean, month?: number | null, day?: number | null) => {
    const era = isBce ? "BCE" : "CE";
    const y = year.toLocaleString();
    if (month && day) return `${y} ${month}/${day} ${era}`;
    if (month) return `${y} ${month} ${era}`;
    return `${y} ${era}`;
  };

  const header = "Year\tTitle\tDescription";
  const lines = sorted.map(
    (e) =>
      `${formatYear(e.year, e.isBce, e.month, e.day)}\t${e.title}\t${e.description || ""}`
  );

  const content = [header, ...lines].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

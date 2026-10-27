"use client";

import React from "react";
import { CHART } from "@/lib/theme";

// Direct labels that THIN THEMSELVES so they never collide.
//
// The house rule is "label selectively — never a number on every point", and a
// daily series here can run past 100 points. So instead of dropping labels (no
// numbers) or printing them all (an unreadable smear), every helper below keeps
// a stride: it prints roughly `maxLabels` evenly spaced values and lets the
// axis, the legend and the tooltip carry the rest. Short ranges (e.g. "Últimos
// 7 dias") fall under the cap and get a label on every point for free.

const FONT = 10;
const CHAR_W = 5.9; // ≈ width of a digit at 10px in the UI sans

/** Print at most `maxLabels` values out of `count`, evenly spaced. */
export function stride(count: number, maxLabels = 12) {
  return count <= maxLabels ? 1 : Math.ceil(count / maxLabels);
}

/**
 * Which indices get a label: evenly spaced, plus the LAST point — the end of a
 * series is what readers look for. The last one is dropped when it would land
 * on top of the previous kept label, which is what happens whenever the series
 * length isn't a clean multiple of the stride.
 */
function keptIndices(count: number, maxLabels: number) {
  const step = stride(count, maxLabels);
  const keep = new Set<number>();
  for (let i = 0; i < count; i += step) keep.add(i);
  const last = count - 1;
  if (last >= 0 && !keep.has(last) && last - Math.max(...keep) >= Math.ceil(step / 2)) keep.add(last);
  return keep;
}

// Recharts types `x/y/width/height` as `number | string`, so the render prop is
// typed loosely and every read goes through `num()`.
interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
  index?: number;
}

const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);

/**
 * Value on the cap of a column / above a line point.
 * Skipped when the value is zero — a column of "0" labels is noise.
 */
export function capLabel({
  format,
  count,
  maxLabels = 12,
  dy = -6,
  fill = CHART.textSecondary,
}: {
  format: (v: number) => string;
  count: number;
  maxLabels?: number;
  dy?: number;
  fill?: string;
}) {
  const keep = keptIndices(count, maxLabels);
  const Comp = (raw: unknown) => {
    const p = raw as LabelProps;
    const i = num(p.index, -1);
    const v = num(p.value);
    if (i < 0 || !keep.has(i) || v === 0) return null;
    // The end labels hug the plot edges, so they anchor inward instead of
    // centering — otherwise the first and last values get cut off.
    const edge = i === 0 ? "start" : i === count - 1 ? "end" : "middle";
    const w = num(p.width);
    const cx = edge === "start" ? num(p.x) : edge === "end" ? num(p.x) + w : num(p.x) + w / 2;
    return (
      <text
        x={cx}
        y={num(p.y) + dy}
        textAnchor={edge}
        fontSize={FONT}
        fontWeight={600}
        fill={fill}
        // A halo in the surface color: a cap label can land on a line or a
        // neighbouring bar, and this keeps it legible without moving it.
        stroke={CHART.surface}
        strokeWidth={3}
        paintOrder="stroke"
        style={{ pointerEvents: "none" }}
      >
        {format(v)}
      </text>
    );
  };
  Comp.displayName = "CapLabel";
  return Comp;
}

/**
 * Label inside a STACKED segment. An interior segment has no free end, so the
 * label only renders when the text actually fits with padding — otherwise the
 * legend and tooltip carry that value instead of a clipped number.
 */
export function segmentLabel({
  format,
  count,
  fill,
  maxLabels = 12,
  minHeight = 13,
}: {
  format: (v: number, index: number) => string | null;
  count: number;
  fill: string; // the segment's own color — decides black vs white text
  maxLabels?: number;
  minHeight?: number;
}) {
  const keep = keptIndices(count, maxLabels);
  const ink = readableInk(fill);
  const Comp = (raw: unknown) => {
    const p = raw as LabelProps;
    const i = num(p.index, -1);
    const h = num(p.height);
    const w = num(p.width);
    if (i < 0 || !keep.has(i) || h < minHeight) return null;
    const text = format(num(p.value), i);
    if (!text) return null;
    if (text.length * CHAR_W + 6 > w) return null; // would be clipped → skip
    return (
      <text
        x={num(p.x) + w / 2}
        y={num(p.y) + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9.5}
        fontWeight={700}
        fill={ink}
        style={{ pointerEvents: "none" }}
      >
        {text}
      </text>
    );
  };
  Comp.displayName = "SegmentLabel";
  return Comp;
}

/** Text set on a colored fill is near-black or white, chosen by the fill's luminance. */
export function readableInk(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45 ? "#232a1c" : "#ffffff";
}

/** Share of a total, as "12%" — the unit readers scan for weight. */
export const sharePct = (v: number, total: number, digits = 0) =>
  total > 0 ? `${((v / total) * 100).toFixed(digits).replace(".", ",")}%` : "";

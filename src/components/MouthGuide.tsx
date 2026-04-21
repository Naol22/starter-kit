"use client";

import { memo, useEffect, useRef, type MutableRefObject } from "react";

export type StabilityZone = "low" | "medium" | "high";

const ZONE_COLORS: Record<StabilityZone, string> = {
  low: "#ef4444", // red-500
  medium: "#f59e0b", // amber-500
  high: "#10b981", // emerald-500
};

function zoneFor(stability: number): StabilityZone {
  if (stability < 0.4) return "low";
  if (stability < 0.75) return "medium";
  return "high";
}

interface MouthGuideProps {
  stabilityRef: MutableRefObject<number>;
  onZoneChange?: (zone: StabilityZone) => void;
}

// Centered oval overlay that visualises camera stability.
//
// Performance notes (R3):
// - Memoized — parent re-renders do not re-render the overlay itself.
// - The stroke colour is written directly to the SVG node via
//   `ellipseRef.current.setAttribute(...)` inside a single rAF loop. This
//   bypasses React reconciliation entirely, so the overlay imposes zero
//   overhead on the video <video> element next to it.
// - The parent is notified via `onZoneChange` ONLY when the colour zone
//   changes (red -> amber -> green), not on every frame. That limits parent
//   re-renders to roughly once per second.
function MouthGuide({ stabilityRef, onZoneChange }: MouthGuideProps) {
  const ellipseRef = useRef<SVGEllipseElement>(null);
  const lastZoneRef = useRef<StabilityZone>("low");

  useEffect(() => {
    let rafId = 0;

    const loop = () => {
      const stability = stabilityRef.current;
      const zone = zoneFor(stability);
      const color = ZONE_COLORS[zone];

      const el = ellipseRef.current;
      if (el) {
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-opacity", String(0.45 + stability * 0.55));
      }

      if (zone !== lastZoneRef.current) {
        lastZoneRef.current = zone;
        onZoneChange?.(zone);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [stabilityRef, onZoneChange]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Soft outer halo so the guide reads against both bright and dark video frames */}
      <ellipse
        cx="50"
        cy="55"
        rx="29"
        ry="19"
        fill="none"
        stroke="black"
        strokeOpacity="0.35"
        strokeWidth="2.4"
      />
      <ellipse
        ref={ellipseRef}
        cx="50"
        cy="55"
        rx="28"
        ry="18"
        fill="none"
        stroke={ZONE_COLORS.low}
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
      />
    </svg>
  );
}

export default memo(MouthGuide);

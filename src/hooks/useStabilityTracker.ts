"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

// Simulates a 0..1 camera-stability signal. In production this would be driven
// by MediaPipe face-mesh landmark variance, gyroscope motion, or a lightweight
// blur-detection pass over each video frame. For the challenge we model it as
// a smoothly drifting value so the zone transitions feel natural.
//
// The value lives in a ref — NEVER in React state — so updating it 60 times
// per second does not trigger component re-renders. Consumers either read the
// ref on demand or subscribe to coarser events (e.g. zone changes).
export function useStabilityTracker(): MutableRefObject<number> {
  const stabilityRef = useRef<number>(0);

  useEffect(() => {
    let rafId = 0;
    let target = 0;
    let velocity = 0;

    const loop = () => {
      // Occasionally pick a new target to simulate hand movement / reposition.
      if (Math.random() < 0.01) {
        target = Math.random();
      }
      // Critically-damped spring toward the target.
      velocity += (target - stabilityRef.current) * 0.02;
      velocity *= 0.92;
      const next = stabilityRef.current + velocity;
      stabilityRef.current = Math.max(0, Math.min(1, next));
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return stabilityRef;
}

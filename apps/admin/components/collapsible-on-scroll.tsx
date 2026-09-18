"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Wraps a block of content that fades + collapses away on a sustained
// downward scroll and smoothly returns on a sustained upward scroll — the
// familiar "hide the header bar as you scroll down a feed" pattern, not
// tied to a fixed scroll position. Used on the Orders page to hide the KPI
// cards while scrolling through the order list, so the heading/tabs above
// them can stay pinned without a permanently-tall sticky block eating the
// screen. md: overrides cancel all of this on desktop, where there's
// plenty of room and no reason to hide anything.
export function CollapsibleOnScroll({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  // Net movement in the current direction, reset whenever the direction
  // reverses — this is what actually fixes the shaking/jumping: momentum
  // scrolling fires many small, occasionally noisy deltas, and toggling on
  // any single 4px move (the old logic) re-triggered the 300ms transition
  // mid-flight against itself. Requiring a real ~28px of continuous
  // movement before flipping means a brief wobble never lands mid-gesture.
  const accumulated = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    function evaluate() {
      ticking.current = false;
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;

      if (y <= 4) {
        accumulated.current = 0;
        setCollapsed(false);
        return;
      }

      const reversed = (delta > 0 && accumulated.current < 0) || (delta < 0 && accumulated.current > 0);
      accumulated.current = reversed ? delta : accumulated.current + delta;

      const THRESHOLD = 28;
      if (accumulated.current > THRESHOLD) {
        setCollapsed(true);
        accumulated.current = 0;
      } else if (accumulated.current < -THRESHOLD) {
        setCollapsed(false);
        accumulated.current = 0;
      }
    }

    // rAF-throttled: momentum scrolling can fire far more often than the
    // display refreshes, so this caps the work to once per frame instead
    // of running the whole evaluation on every single scroll event.
    function handleScroll() {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(evaluate);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out md:max-h-none md:opacity-100",
        collapsed ? "max-h-0 opacity-0" : "max-h-[600px] opacity-100"
      )}
    >
      {children}
    </div>
  );
}

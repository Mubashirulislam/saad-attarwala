"use client";

import { useEffect, useRef } from "react";

// Distance (px) of scroll over which the content fully fades/collapses.
// Small on purpose — this should finish well before you're deep in the
// order list, not still animating three cards down.
const COLLAPSE_DISTANCE = 140;

const DESKTOP_BREAKPOINT = 768; // Tailwind's md:

// Wraps a block of content (the KPI cards) whose opacity and height are a
// direct, continuous function of window.scrollY — not a collapsed/expanded
// boolean toggled by scroll direction with its own CSS transition. That
// distinction is the whole point:
//
// - A direction-based toggle re-triggers a fixed-duration animation on
//   every reversal, which is what caused the earlier "shaking" — two
//   competing transitions colliding when the direction flipped mid-scroll.
// - It also meant ANY upward wiggle re-expanded the cards no matter how
//   far down the list you were, which felt wrong ("appears no matter where
//   I am").
//
// Deriving opacity/height straight from scrollY fixes both: the value
// tracks your finger 1:1 every frame (no transition, no lag, nothing to
// fight), and it can only grow back as scrollY itself decreases — i.e.
// only once you've actually scrolled back up near the top card, not on
// any small reversal further down the list.
export function CollapsibleOnScroll({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fullHeight = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function measure() {
      if (contentRef.current) fullHeight.current = contentRef.current.scrollHeight;
    }

    function apply() {
      ticking.current = false;
      const el = wrapperRef.current;
      if (!el) return;
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        // Clear any inline override so the element falls back to its
        // normal (always fully visible) desktop layout.
        el.style.opacity = "";
        el.style.maxHeight = "";
        return;
      }
      const progress = Math.min(Math.max(window.scrollY / COLLAPSE_DISTANCE, 0), 1);
      el.style.opacity = String(1 - progress);
      el.style.maxHeight = `${fullHeight.current * (1 - progress)}px`;
    }

    function handleScroll() {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(apply);
      }
    }

    function handleResize() {
      measure();
      apply();
    }

    measure();
    apply();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="overflow-hidden">
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

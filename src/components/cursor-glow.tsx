import { useEffect, useRef } from "react";

/**
 * A soft paper spotlight that trails the pointer across the whole page.
 * Pointer-fine devices only, and disabled under prefers-reduced-motion.
 * Purely decorative and non-interactive (pointer-events: none).
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover || reduced) return;

    let tx = -1000;
    let ty = -1000;
    let cx = -1000;
    let cy = -1000;
    let raf = 0;
    let running = false;

    const tick = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      el.style.setProperty("--cx", `${cx}px`);
      el.style.setProperty("--cy", `${cy}px`);
      if (Math.abs(tx - cx) > 0.25 || Math.abs(ty - cy) > 0.25) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (cx < -900 || cy < -900) {
        cx = tx;
        cy = ty;
      }
      el.dataset.active = "true";
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onLeave = () => {
      el.dataset.active = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}

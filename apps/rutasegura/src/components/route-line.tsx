"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { cx } from "./ui";
import styles from "./route-line.module.css";

const PATHS = {
  hero: "M 6 300 C 220 330, 300 70, 500 200 S 790 330, 994 100",
  footer: "M -20 320 C 180 120, 400 380, 620 210 S 880 60, 1020 150",
} as const;

/**
 * Motivo de la ruta: trazo discontinuo entre dos ciudades y un punto que lo
 * recorre. El SVG se estira con el contenedor, así que el punto y las ciudades
 * son elementos HTML que se colocan sobre el trazo en coordenadas de pantalla.
 */
export function RouteLine({
  variant,
  from,
  to,
  className,
}: {
  variant: keyof typeof PATHS;
  from?: string;
  to?: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const start = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = wrap.current;
    const line = path.current;
    const marker = dot.current;
    if (!container || !line || !marker) return;
    const length = line.getTotalLength();
    const progress = { value: 0 };

    function toScreen(at: number) {
      const point = line!.getPointAtLength(length * at);
      const matrix = line!.getScreenCTM();
      const box = container!.getBoundingClientRect();
      if (!matrix) return { x: 0, y: 0 };
      return {
        x: matrix.a * point.x + matrix.c * point.y + matrix.e - box.left,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f - box.top,
      };
    }

    function place() {
      const here = toScreen(progress.value);
      gsap.set(marker, { x: here.x, y: here.y, opacity: 1 });
      for (const [label, at] of [
        [start.current, 0],
        [end.current, 1],
      ] as const) {
        if (!label) continue;
        const spot = toScreen(at);
        gsap.set(label, { x: spot.x, y: spot.y, opacity: 1 });
      }
    }

    place();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tween: gsap.core.Tween | null = null;
    if (reduce) {
      progress.value = 0.62;
      place();
    } else {
      tween = gsap.to(progress, {
        value: 1,
        duration: variant === "hero" ? 3.2 : 6,
        ease: "power1.inOut",
        repeat: -1,
        repeatDelay: 0.8,
        onUpdate: place,
      });
    }

    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [variant]);

  return (
    <div ref={wrap} className={cx(styles.wrap, styles[variant], className)} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 1000 400" preserveAspectRatio="none">
        <path ref={path} d={PATHS[variant]} className={styles.path} />
      </svg>
      <span ref={dot} className={styles.dot} />
      {from ? (
        <span ref={start} className={styles.city}>
          <span className={styles.cityText}>{from}</span>
        </span>
      ) : null}
      {to ? (
        <span ref={end} className={cx(styles.city, styles.cityEnd)}>
          <span className={styles.cityText}>{to}</span>
        </span>
      ) : null}
    </div>
  );
}

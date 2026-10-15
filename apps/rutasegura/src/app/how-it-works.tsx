"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { cx } from "@/components/ui";
import styles from "./home.module.css";

const STEPS = [
  {
    number: "01",
    title: "Rastrea sin cuenta",
    text: "Con la guía y los últimos 4 dígitos del teléfono ves dónde va tu paquete.",
  },
  {
    number: "02",
    title: "Guárdalo en tu cuenta",
    text: "Vincula la guía y sigue todos tus envíos desde un solo lugar.",
  },
  {
    number: "03",
    title: "Elige cuándo recibirlo",
    text: "Escoge el día y la franja de entrega. Si cambian tus planes, la reprogramas.",
  },
];

/**
 * Tres pasos completos sobre la rejilla. En pantallas anchas, un riel une los
 * números y su punto avanza de la primera a la última parada con el scroll.
 */
export function HowItWorks() {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(min-width: 64rem) and (prefers-reduced-motion: no-preference)", () => {
      const root = section.current;
      const line = rail.current;
      const marker = dot.current;
      if (!root || !line || !marker) return;
      const stops = line.querySelectorAll<HTMLElement>("[data-stop]");
      const distance = () => {
        const first = stops[0]?.getBoundingClientRect();
        const last = stops[stops.length - 1]?.getBoundingClientRect();
        return first && last ? last.left - first.left : 0;
      };
      const tween = gsap.fromTo(
        marker,
        { x: 0 },
        {
          x: () => distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 75%",
            end: "bottom 60%",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        },
      );
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => media.revert();
  }, []);

  return (
    <section ref={section} className={cx(styles.how, styles.container)} aria-labelledby="how-title">
      <div className={styles.howHead}>
        <p className={styles.eyebrow}>Cómo funciona</p>
        <h2 id="how-title" className={styles.h2}>
          Tres pasos, ninguna llamada.
        </h2>
      </div>
      <div className={styles.howBody}>
        <div ref={rail} className={styles.howRail} aria-hidden="true">
          <span className={styles.howStop} data-stop="" />
          <span className={styles.howStop} data-stop="" />
          <span className={styles.howStop} data-stop="" />
          <span ref={dot} className={styles.howDot} />
        </div>
        <ol className={styles.howTrack}>
          {STEPS.map((step) => (
            <li key={step.number} className={styles.howStep}>
              <span className={styles.howNumber} aria-hidden="true">
                {step.number}
              </span>
              <h3 className={styles.howTitle}>{step.title}</h3>
              <p className={styles.howText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

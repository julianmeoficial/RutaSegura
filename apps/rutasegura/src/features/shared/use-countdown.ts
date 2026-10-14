"use client";

import { useEffect, useState } from "react";

/** Segundos que faltan hasta `deadline` (ms desde epoch), actualizados cada segundo. */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [deadline]);

  return deadline ? Math.max(0, (deadline - now) / 1000) : 0;
}

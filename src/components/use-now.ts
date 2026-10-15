"use client";

import { useEffect, useState } from "react";

/**
 * Horloge côté client, `null` avant le montage pour éviter les écarts
 * d'hydratation sur les comptes à rebours.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement, pour ne pas gêner le hot reload). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

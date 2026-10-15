"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./activity-map";
import { copy } from "@/lib/copy";

/** Leaflet a besoin de `window` : chargement côté client uniquement. */
const ActivityMap = dynamic(() => import("./activity-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" aria-label={copy.common.mapLoading} />,
});

export type { MapPoint };

export function MapView(props: {
  points: MapPoint[];
  you: { lat: number; lng: number };
  className?: string;
  zoomControl?: boolean;
}) {
  return <ActivityMap {...props} />;
}

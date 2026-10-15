export type LatLng = { lat: number; lng: number };

/** Place Saint-Lambert, Liège — position par défaut quand la géolocalisation est refusée. */
export const LIEGE: LatLng = { lat: 50.6451, lng: 5.5734 };
export const POSITION_COOKIE = "deniche_pos";

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Temps de trajet estimé en voiture : distance à vol d'oiseau × 1,3 (détours),
 * 30 km/h de moyenne sur les 5 premiers km (ville), 70 km/h au-delà.
 * Une estimation honnête, pas un calcul d'itinéraire.
 */
export function estimateDriveMinutes(km: number) {
  const road = km * 1.3;
  const city = Math.min(road, 5);
  const rest = Math.max(0, road - 5);
  return Math.max(5, Math.round((city / 30 + rest / 70) * 60));
}

export function parsePosition(raw: string | undefined | null): LatLng | null {
  if (!raw) return null;
  const [lat, lng] = decodeURIComponent(raw).split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatPrice } from "@/lib/format";

export type MapPoint = {
  id: string;
  slug: string;
  title: string;
  city: string;
  lat: number;
  lng: number;
  priceCents: number;
  discountPct: number;
  image: string;
  href: string;
};

function priceIcon(p: MapPoint, highlighted?: boolean) {
  const discount = p.discountPct > 0;
  const label = formatPrice(p.priceCents, { short: true });
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<span style="transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;padding:5px 10px;border-radius:999px;font:600 13px/1 var(--font-dm-sans),system-ui;box-shadow:0 2px 8px rgb(20 32 27/.18);background:${
      discount ? "#FF5A36" : highlighted ? "#1F3D2F" : "#fff"
    };color:${discount ? "#14201B" : highlighted ? "#FAF7F2" : "#14201B"};border:1px solid ${discount ? "#FF5A36" : "#d6cdbf"}">${
      discount ? `−${p.discountPct}% · ` : ""
    }${label}</span>`,
  });
}

const youIcon = L.divIcon({
  className: "",
  iconAnchor: [9, 9],
  html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:#1F3D2F;border:3px solid #FAF7F2;box-shadow:0 0 0 6px rgb(31 61 47/.18)"></span>`,
});

function FitBounds({ points, you }: { points: MapPoint[]; you: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
    coords.push(you);
    if (coords.length > 1) map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 12 });
    else map.setView(you, 11);
  }, [map, points, you]);
  return null;
}

export default function ActivityMap({
  points,
  you,
  className,
  zoomControl = true,
}: {
  points: MapPoint[];
  you: { lat: number; lng: number };
  className?: string;
  zoomControl?: boolean;
}) {
  const center = useMemo<[number, number]>(() => [you.lat, you.lng], [you.lat, you.lng]);
  return (
    <MapContainer center={center} zoom={10} scrollWheelZoom className={className} zoomControl={zoomControl} attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} you={center} />
      <Marker position={center} icon={youIcon} keyboard={false} title="Ta position" />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={priceIcon(p)} title={p.title}>
          <Popup>
            <a href={p.href} style={{ display: "block", width: 200, color: "#14201B", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 10 }} />
              <strong style={{ display: "block", marginTop: 8, fontSize: 14, lineHeight: 1.3 }}>{p.title}</strong>
              <span style={{ fontSize: 12, color: "#5f6b65" }}>
                {p.city} · dès {formatPrice(p.priceCents, { short: true })}
              </span>
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

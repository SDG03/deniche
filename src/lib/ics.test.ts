import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("fichier .ics", () => {
  const ics = buildIcs({
    uid: "DN-ABC123",
    title: "Kayak, version courte; avec virgule",
    description: "Ligne 1\nLigne 2",
    location: "Rue de la Reffe 2, 4920 Aywaille",
    start: new Date("2026-10-25T09:00:00Z"),
    durationMin: 90,
    now: new Date("2026-10-15T10:00:00Z"),
  });

  it("utilise des dates UTC et une durée correcte", () => {
    expect(ics).toContain("DTSTART:20261025T090000Z");
    expect(ics).toContain("DTEND:20261025T103000Z");
  });

  it("échappe virgules, points-virgules et retours à la ligne", () => {
    expect(ics).toContain("SUMMARY:Kayak\\, version courte\\; avec virgule");
    expect(ics).toContain("DESCRIPTION:Ligne 1\\nLigne 2");
  });

  it("termine les lignes par CRLF et ne dépasse pas 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

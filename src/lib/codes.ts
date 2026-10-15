import { randomBytes } from "node:crypto";

// Sans 0/O, 1/I/L : lisible à voix haute et sur un écran de téléphone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const newBookingReference = () => `DN-${randomCode(6)}`;
export const newCheckinCode = () => randomCode(6);
export const newToken = () => randomBytes(24).toString("base64url");

export function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

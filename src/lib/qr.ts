import "server-only";
import QRCode from "qrcode";

/** Contenu du QR d'arrivée, lu par l'écran « Accueil » de l'espace partenaire. */
export const qrPayload = (reference: string, checkinCode: string) => `DENICHE:${reference}:${checkinCode}`;

export async function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#14201B", light: "#00000000" },
  });
}

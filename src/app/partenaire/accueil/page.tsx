import { copy } from "@/lib/copy";
import { Checkin } from "./checkin";

export const metadata = { title: copy.partner.checkin };

export default function CheckinPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Accueil des clients</h1>
      <p className="mt-1 mb-6 text-ink-soft">Scanne le QR code ou saisis le code d&apos;arrivée pour valider une réservation.</p>
      <Checkin />
    </div>
  );
}

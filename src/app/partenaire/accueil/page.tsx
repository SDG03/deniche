import { copy } from "@/lib/copy";
import { Checkin } from "./checkin";

export const metadata = { title: copy.partner.checkin };

export default function CheckinPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{copy.partnerUi.checkin.title}</h1>
      <p className="mt-1 mb-6 text-ink-soft">{copy.partnerUi.checkin.intro}</p>
      <Checkin />
    </div>
  );
}

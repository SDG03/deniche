import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { ActivityForm } from "../activity-form";

export const metadata = { title: copy.partner.newActivity };

export default async function NewActivityPage() {
  await requirePartner();
  return (
    <div>
      <Link href="/partenaire/activites" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {copy.partner.activities}
      </Link>
      <h1 className="mt-1 mb-6 font-display text-3xl font-bold">{copy.partner.newActivity}</h1>
      <ActivityForm
        values={{
          title: "",
          tagline: "",
          category: "atelier",
          description: "",
          address: "",
          city: "Liège",
          latitude: 50.6412,
          longitude: 5.5718,
          durationMin: 90,
          minPeople: 1,
          maxPeople: 8,
          basePrice: 25,
          minAge: 8,
          setting: "INDOOR",
          level: "EASY",
          accessibility: "",
          tags: "",
          cancellationPolicy: "MODERATE",
          published: true,
          images: [],
        }}
      />
    </div>
  );
}

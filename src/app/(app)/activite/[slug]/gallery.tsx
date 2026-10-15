"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { copy } from "@/lib/copy";

type Credit = { author: string; license: string; source: string };

export function Gallery({ images, alts, credits }: { images: string[]; alts: string[]; credits: Credit[] }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const credit = credits[index];

  return (
    <div>
      {/* Mobile : carrousel plein écran */}
      <div className="relative md:hidden">
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-roledescription="carrousel"
          aria-label={copy.activity.galleryLabel}
        >
          {images.map((src, i) => (
            <div key={src} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-sand">
              <Image src={src} alt={alts[i]} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="tabular absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-cream">
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Desktop : mosaïque */}
      <div className="hidden h-[440px] grid-cols-[2fr_1fr] grid-rows-2 gap-2 overflow-hidden rounded-[var(--radius-card)] md:grid">
        {images.slice(0, 3).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            className={`relative bg-sand ${i === 0 ? "row-span-2" : ""}`}
            aria-label={copy.activity.showCredit(i + 1)}
          >
            <Image
              src={src}
              alt={alts[i]}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 1152px) 740px, 66vw" : "370px"}
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {credit && credit.source && (
        <p className="mt-2 px-4 text-2xs text-ink-mute md:px-0">
          {copy.activity.photoCredit} {index + 1} : {credit.author} ·{" "}
          <a
            href={credit.source}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            {credit.license}
          </a>
        </p>
      )}
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Bottom sheet basé sur <dialog> natif : piège à focus, Échap et
 * `inert` du reste de la page gérés par le navigateur.
 * Sur desktop il devient un panneau centré.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-cream p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-sheet-up md:m-auto md:max-w-lg md:rounded-3xl md:open:animate-fade-up"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="relative flex items-center justify-between border-b border-line px-5 pt-3 pb-3">
          <span aria-hidden className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line-strong md:hidden" />
          <h2 className="mt-2 font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 grid size-11 place-items-center rounded-full hover:bg-ink/5"
            aria-label="Fermer"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line bg-cream px-5 py-3">{footer}</div>}
      </div>
    </dialog>
  );
}

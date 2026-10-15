"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/actions/booking";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export function CancelBooking({ bookingId, amount, until }: { bookingId: string; amount: string; until: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
      >
        {copy.bookings.cancel}
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.bookings.cancelConfirm}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Garder
            </Button>
            <Button
              variant="forest"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("bookingId", bookingId);
                  await cancelBooking(fd);
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Annulation…" : "Oui, annuler"}
            </Button>
          </div>
        }
      >
        <p className="text-ink-soft">
          Tu seras remboursé de <strong className="text-ink">{amount}</strong>. {copy.bookings.refundNote}
        </p>
        <p className="mt-2 text-sm text-ink-mute">{copy.bookings.cancellableUntil(until)}.</p>
      </BottomSheet>
    </>
  );
}

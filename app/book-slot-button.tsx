"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function BookSlotButton({
  roomId,
  date,
  startHour,
  forceOverride = false,
}: {
  roomId: number;
  date: string;
  startHour: number;
  forceOverride?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      forceOverride &&
      !window.confirm(
        "Ce créneau est déjà réservé par quelqu'un d'autre. Forcer la réservation à sa place ?"
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, date, startHour }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de la réservation.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={
          forceOverride
            ? "w-full rounded-full border-2 border-danger bg-transparent px-2 py-1.5 text-xs font-black text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
            : "w-full rounded-full bg-navy px-2 py-1.5 text-xs font-black text-white transition-colors hover:bg-navy/85 disabled:opacity-50 dark:border dark:border-border-strong dark:bg-white/8 dark:text-foreground dark:hover:bg-white/14"
        }
      >
        {isPending ? "···" : forceOverride ? "Forcer" : "Réserver"}
      </button>
      {error && <p className="max-w-24 text-xs text-danger">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CancelSlotButton({ bookingId }: { bookingId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de l'annulation.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded bg-sky-600/10 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-600/20 disabled:opacity-50 dark:text-sky-400"
      >
        {isPending ? "..." : "Annuler"}
      </button>
      {error && <p className="max-w-24 text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function BookSlotButton({
  roomId,
  date,
  startHour,
}: {
  roomId: number;
  date: string;
  startHour: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
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
        className="w-full rounded bg-emerald-600/10 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-600/20 disabled:opacity-50 dark:text-emerald-400"
      >
        {isPending ? "..." : "Réserver"}
      </button>
      {error && <p className="max-w-24 text-xs text-red-600">{error}</p>}
    </div>
  );
}

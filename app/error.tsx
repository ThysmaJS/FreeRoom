"use client";

import { WifiOff } from "lucide-react";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface px-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-navy dark:bg-cyan">
        <WifiOff
          className="size-6 text-cyan dark:text-navy"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <div>
        <h1 className="text-xl font-black">Impossible de contacter le serveur</h1>
        <p className="mt-2 max-w-sm text-muted">
          Le service est momentanément indisponible (base de données
          injoignable). Réessayez dans quelques instants.
        </p>
      </div>
      <button
        onClick={retry}
        className="glow mt-2 rounded-full bg-navy px-5 py-2.5 font-black text-white transition-opacity hover:opacity-90 dark:bg-cyan dark:text-accent-ink"
      >
        Réessayer
      </button>
    </div>
  );
}

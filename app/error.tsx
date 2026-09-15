"use client";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Impossible de contacter le serveur</h1>
      <p className="max-w-sm text-black/60 dark:text-white/60">
        Le service est momentanément indisponible (base de données injoignable).
        Réessayez dans quelques instants.
      </p>
      <button
        onClick={retry}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
      >
        Réessayer
      </button>
    </div>
  );
}

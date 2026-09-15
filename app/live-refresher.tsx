"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveRefresher({
  intervalMs = 8000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}

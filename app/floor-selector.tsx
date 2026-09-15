import Link from "next/link";
import { FLOORS } from "@/lib/bookings";

export default function FloorSelector({
  date,
  floor,
}: {
  date: string;
  floor: number;
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-border-strong p-1">
        {FLOORS.map((f) => (
          <Link
            key={f.value}
            href={`/?date=${date}&floor=${f.value}`}
            aria-current={f.value === floor ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-black transition-colors ${
              f.value === floor
                ? "glow bg-cyan text-accent-ink"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

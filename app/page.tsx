import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getUser } from "@/lib/dal";
import {
  addDays,
  formatDateFr,
  getRoomsForDate,
  isValidDate,
  isValidFloor,
  todayISODate,
} from "@/lib/bookings";
import AppHeader from "./app-header";
import DayGrid from "./day-grid";
import FloorSelector from "./floor-selector";
import LiveRefresher from "./live-refresher";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; floor?: string }>;
}) {
  const user = await getUser();
  const { date: rawDate, floor: rawFloor } = await searchParams;
  const date = rawDate && isValidDate(rawDate) ? rawDate : todayISODate();
  const floor =
    rawFloor && isValidFloor(Number(rawFloor)) ? Number(rawFloor) : 0;

  const rooms = await getRoomsForDate(date, user!.id, floor);
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const isToday = date === todayISODate();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader userName={user!.name} active="grid" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <FloorSelector date={date} floor={floor} />

        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/?date=${prevDate}&floor=${floor}`}
            aria-label="Jour précédent"
            className="flex size-9 items-center justify-center rounded-full border border-border-strong text-foreground transition-colors hover:bg-surface"
          >
            <ChevronLeft className="size-4.5" strokeWidth={2.25} aria-hidden />
          </Link>

          <div className="text-center">
            <p className="text-base font-black capitalize sm:text-lg">
              {formatDateFr(date)}
            </p>
            <p className="text-xs text-muted">
              {isToday ? "Aujourd'hui" : ""}
              {isToday && " · "}
              actualisation automatique
            </p>
          </div>

          <Link
            href={`/?date=${nextDate}&floor=${floor}`}
            aria-label="Jour suivant"
            className="flex size-9 items-center justify-center rounded-full border border-border-strong text-foreground transition-colors hover:bg-surface"
          >
            <ChevronRight className="size-4.5" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>

        <DayGrid rooms={rooms} date={date} isToday={isToday} />
      </div>
      <LiveRefresher />
    </div>
  );
}

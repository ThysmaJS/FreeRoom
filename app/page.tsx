import Link from "next/link";
import { getUser } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";
import {
  addDays,
  formatDateFr,
  getRoomsForDate,
  isValidDate,
  todayISODate,
} from "@/lib/bookings";
import DayGrid from "./day-grid";
import LiveRefresher from "./live-refresher";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getUser();
  const { date: rawDate } = await searchParams;
  const date = rawDate && isValidDate(rawDate) ? rawDate : todayISODate();

  const rooms = await getRoomsForDate(date, user!.id);
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Bonjour {user?.name} 👋</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/reservations"
            className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Mes réservations
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/?date=${prevDate}`}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
        >
          ← Veille
        </Link>
        <span className="text-center text-sm font-medium capitalize">
          {formatDateFr(date)}
          <span className="ml-1.5 hidden text-xs font-normal text-black/40 sm:inline dark:text-white/40">
            · actualisation auto
          </span>
        </span>
        <Link
          href={`/?date=${nextDate}`}
          className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
        >
          Lendemain →
        </Link>
      </div>

      <DayGrid rooms={rooms} date={date} />
      <LiveRefresher />
    </div>
  );
}

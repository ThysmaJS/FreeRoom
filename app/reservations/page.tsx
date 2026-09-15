import Link from "next/link";
import { getUser } from "@/lib/dal";
import { formatDateFr, getUserBookings } from "@/lib/bookings";
import CancelSlotButton from "../cancel-slot-button";

export default async function ReservationsPage() {
  const user = await getUser();
  const bookings = await getUserBookings(user!.id);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Mes réservations</h1>
        <Link
          href="/"
          className="shrink-0 rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
        >
          ← Retour aux salles
        </Link>
      </div>

      {bookings.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Aucune réservation à venir.{" "}
          <Link href="/" className="underline">
            Réserver un créneau
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
            >
              <div>
                <p className="font-medium">{booking.roomName}</p>
                <p className="text-sm capitalize text-black/60 dark:text-white/60">
                  {formatDateFr(booking.date)} · {booking.startHour}h–
                  {booking.endHour}h
                </p>
              </div>
              <CancelSlotButton bookingId={booking.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

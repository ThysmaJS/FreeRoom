import Link from "next/link";
import { getUser } from "@/lib/dal";
import { formatDateFr, getUserBookings } from "@/lib/bookings";
import AppHeader from "../app-header";
import CancelSlotButton from "../cancel-slot-button";

export default async function ReservationsPage() {
  const user = await getUser();
  const bookings = await getUserBookings(user!.id);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        userName={user!.name}
        active="reservations"
        isAdmin={user!.isAdmin}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="text-xl font-black">Mes réservations</h1>

        {bookings.length === 0 ? (
          <p className="text-muted">
            Aucune réservation à venir.{" "}
            <Link href="/" className="text-navy underline dark:text-cyan">
              Réserver un créneau
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col gap-3 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-black">{booking.roomName}</p>
                  <p className="text-sm capitalize text-muted">
                    {formatDateFr(booking.date)} · {booking.startHour}h–
                    {booking.endHour}h
                  </p>
                </div>
                <div className="w-full shrink-0 sm:w-28">
                  <CancelSlotButton bookingId={booking.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

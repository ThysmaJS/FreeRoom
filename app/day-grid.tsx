import type { RoomWithSlots } from "@/lib/bookings";
import BookSlotButton from "./book-slot-button";
import CancelSlotButton from "./cancel-slot-button";

export default function DayGrid({
  rooms,
  date,
}: {
  rooms: RoomWithSlots[];
  date: string;
}) {
  const hours = rooms[0]?.slots.map((s) => s.hour) ?? [];

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Aucune salle n&apos;est configurée pour le moment.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="sticky left-0 z-10 min-w-32 bg-background px-3 py-2 text-left font-medium">
              Salle
            </th>
            {hours.map((hour) => (
              <th
                key={hour}
                className="min-w-24 whitespace-nowrap px-2 py-2 text-center font-medium"
              >
                {hour}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="border-b border-black/10 last:border-0 dark:border-white/15"
            >
              <td className="sticky left-0 z-10 min-w-32 whitespace-nowrap bg-background px-3 py-2 font-medium">
                {room.name}
                {room.capacity != null && (
                  <span className="ml-1 text-xs font-normal text-black/50 dark:text-white/50">
                    ({room.capacity} pl.)
                  </span>
                )}
              </td>
              {room.slots.map((slot) => (
                <td key={slot.hour} className="px-1.5 py-1.5 text-center">
                  {slot.status === "free" && (
                    <BookSlotButton
                      roomId={room.id}
                      date={date}
                      startHour={slot.hour}
                    />
                  )}
                  {slot.status === "own" && (
                    <CancelSlotButton bookingId={slot.bookingId!} />
                  )}
                  {slot.status === "booked" && (
                    <span className="inline-block w-full rounded bg-black/10 px-2 py-1.5 text-xs text-black/40 dark:bg-white/10 dark:text-white/40">
                      Occupé
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

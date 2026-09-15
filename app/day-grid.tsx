import type { RoomWithSlots } from "@/lib/bookings";
import BookSlotButton from "./book-slot-button";
import CancelSlotButton from "./cancel-slot-button";

export default function DayGrid({
  rooms,
  date,
  isToday,
}: {
  rooms: RoomWithSlots[];
  date: string;
  isToday: boolean;
}) {
  const hours = rooms[0]?.slots.map((s) => s.hour) ?? [];
  const currentHour = isToday ? new Date().getHours() : null;

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune salle n&apos;est configurée pour le moment.
      </p>
    );
  }

  // Rows recede in tone top-to-bottom, like tiers banked away from the
  // stage — a monotonic blend from --background to --surface-strong,
  // never an alternating zebra stripe.
  function tierStyle(rowIndex: number) {
    const percent =
      rooms.length > 1 ? (rowIndex / (rooms.length - 1)) * 100 : 0;
    return {
      backgroundColor: `color-mix(in srgb, var(--surface-strong) ${percent}%, var(--background))`,
    };
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-strong">
            <th className="sticky left-0 z-20 min-w-32 bg-surface-strong px-4 py-3 text-left text-xs font-black tracking-wide text-muted uppercase">
              Salle
            </th>
            {hours.map((hour) => (
              <th
                key={hour}
                className={`relative min-w-20 whitespace-nowrap px-2 py-3 text-center text-sm font-black ${
                  hour === currentHour ? "text-accent-ink" : ""
                }`}
              >
                {hour === currentHour && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-now"
                  />
                )}
                {hour}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, rowIndex) => {
            const style = tierStyle(rowIndex);
            return (
              <tr
                key={room.id}
                style={style}
                className="border-b border-border last:border-0"
              >
                <td
                  style={style}
                  className="sticky left-0 z-10 min-w-32 whitespace-nowrap px-4 py-2.5 font-black"
                >
                  {room.name}
                  {room.capacity != null && (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      {room.capacity} pl.
                    </span>
                  )}
                </td>
                {room.slots.map((slot) => (
                  <td
                    key={slot.hour}
                    className={`px-1.5 py-1.5 text-center ${
                      slot.hour === currentHour ? "bg-now/10" : ""
                    }`}
                  >
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
                      <span className="inline-block w-full rounded-full bg-surface-strong px-2 py-1.5 text-xs text-muted">
                        Occupé
                      </span>
                    )}
                    {slot.status === "past" && (
                      <span className="inline-block w-full px-2 py-1.5 text-xs text-muted/50">
                        Passé
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

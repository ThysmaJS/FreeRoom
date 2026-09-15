import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/dal";
import { createBooking } from "@/lib/bookings";

export async function POST(request: NextRequest) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.roomId !== "number" ||
    typeof body.date !== "string" ||
    typeof body.startHour !== "number"
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await createBooking({
    roomId: body.roomId,
    userId,
    date: body.date,
    startHour: body.startHour,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        { error: "Ce créneau vient d'être réservé par quelqu'un d'autre." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}

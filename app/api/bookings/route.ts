import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/dal";
import { createBooking } from "@/lib/bookings";

export async function POST(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) {
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
    userId: user.id,
    date: body.date,
    startHour: body.startHour,
    isAdmin: user.isAdmin,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        { error: "Ce créneau vient d'être réservé par quelqu'un d'autre." },
        { status: 409 }
      );
    }
    if (result.reason === "past") {
      return NextResponse.json(
        { error: "Ce créneau est déjà passé." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}

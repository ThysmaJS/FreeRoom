import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/dal";
import { cancelBooking } from "@/lib/bookings";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const result = await cancelBooking({ bookingId, userId });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Vous ne pouvez annuler que vos propres réservations." },
      { status: 403 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

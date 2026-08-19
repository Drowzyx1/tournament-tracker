import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/serialize";

async function assertOwnedTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) return null;
  return trip;
}

// PATCH /api/trips/:id — rename a trip / change its event date
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTrip(params.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; eventDate?: Date | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("eventDate" in body) data.eventDate = body.eventDate ? new Date(body.eventDate) : null;

  const trip = await prisma.trip.update({
    where: { id: params.id },
    data,
    include: { transactions: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    trip: {
      ...trip,
      eventDate: toDateOnly(trip.eventDate),
      transactions: trip.transactions.map((tx) => ({ ...tx, date: toDateOnly(tx.date) })),
    },
  });
}

// DELETE /api/trips/:id — delete a trip and its transactions
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTrip(params.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

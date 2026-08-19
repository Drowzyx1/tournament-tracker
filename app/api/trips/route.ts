import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/serialize";

// GET /api/trips — list the signed-in user's trips (with transactions)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    include: { transactions: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    trips: trips.map((t) => ({
      ...t,
      eventDate: toDateOnly(t.eventDate),
      transactions: t.transactions.map((tx) => ({ ...tx, date: toDateOnly(tx.date) })),
    })),
  });
}

// POST /api/trips — create a new trip for the signed-in user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New Trip";
  const eventDate = body.eventDate ? new Date(body.eventDate) : null;

  const trip = await prisma.trip.create({
    data: { name, eventDate, userId: session.user.id },
    include: { transactions: true },
  });

  return NextResponse.json({ trip: { ...trip, eventDate: toDateOnly(trip.eventDate) } }, { status: 201 });
}

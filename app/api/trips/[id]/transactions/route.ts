import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/serialize";
import { validateAttachment } from "@/lib/attachments";

// POST /api/trips/:id/transactions — add an expense or earning to a trip
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip || trip.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type === "EARNING" ? "EARNING" : body.type === "EXPENSE" ? "EXPENSE" : null;
  const desc = typeof body.desc === "string" ? body.desc.trim() : "";
  const amount = Number(body.amount);
  const date = body.date ? new Date(body.date) : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const attachmentData = typeof body.attachmentData === "string" ? body.attachmentData : null;
  const attachmentName =
    typeof body.attachmentName === "string" && body.attachmentName.trim()
      ? body.attachmentName.trim()
      : null;

  if (!type || !desc || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  }
  if (attachmentData) {
    const attachmentError = validateAttachment(attachmentData);
    if (attachmentError) {
      return NextResponse.json({ error: attachmentError }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      desc,
      amount,
      date,
      notes,
      attachmentData,
      attachmentName: attachmentData ? attachmentName : null,
      tripId: trip.id,
    },
  });

  return NextResponse.json(
    { transaction: { ...transaction, date: toDateOnly(transaction.date) } },
    { status: 201 }
  );
}

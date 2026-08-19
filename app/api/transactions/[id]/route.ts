import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/serialize";
import { validateAttachment } from "@/lib/attachments";

async function assertOwnedTransaction(id: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { trip: true },
  });
  if (!transaction || transaction.trip.userId !== userId) return null;
  return transaction;
}

// PATCH /api/transactions/:id — edit an existing entry's amount, description,
// date, notes, or attachment (in place, without deleting and recreating it)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTransaction(params.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    desc?: string;
    amount?: number;
    date?: Date | null;
    notes?: string | null;
    attachmentData?: string | null;
    attachmentName?: string | null;
  } = {};

  if ("desc" in body) {
    const desc = typeof body.desc === "string" ? body.desc.trim() : "";
    if (!desc) {
      return NextResponse.json({ error: "Description can't be empty" }, { status: 400 });
    }
    data.desc = desc;
  }

  if ("amount" in body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    data.amount = amount;
  }

  if ("date" in body) {
    data.date = body.date ? new Date(body.date) : null;
  }

  if ("notes" in body) {
    data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  }

  if ("attachmentData" in body) {
    const attachmentData = typeof body.attachmentData === "string" ? body.attachmentData : null;
    if (attachmentData) {
      const attachmentError = validateAttachment(attachmentData);
      if (attachmentError) {
        return NextResponse.json({ error: attachmentError }, { status: 400 });
      }
      data.attachmentData = attachmentData;
      data.attachmentName =
        typeof body.attachmentName === "string" && body.attachmentName.trim()
          ? body.attachmentName.trim()
          : null;
    } else {
      data.attachmentData = null;
      data.attachmentName = null;
    }
  }

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ transaction: { ...transaction, date: toDateOnly(transaction.date) } });
}

// DELETE /api/transactions/:id — remove a single expense/earning entry
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await assertOwnedTransaction(params.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";
import type { SerializedTrip } from "@/lib/types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user!.id },
    include: { transactions: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  // Dates aren't directly serializable across the server/client component
  // boundary, so convert everything to plain strings first.
  const initialTrips: SerializedTrip[] = trips.map((t) => ({
    id: t.id,
    name: t.name,
    eventDate: t.eventDate ? t.eventDate.toISOString().slice(0, 10) : null,
    transactions: t.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      desc: tx.desc,
      amount: tx.amount,
      date: tx.date ? tx.date.toISOString().slice(0, 10) : null,
      notes: tx.notes,
      attachmentData: tx.attachmentData,
      attachmentName: tx.attachmentName,
    })),
  }));

  return <Dashboard initialTrips={initialTrips} userName={session.user?.name ?? null} />;
}

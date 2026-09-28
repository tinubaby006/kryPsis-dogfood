import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { HomeClient } from "./components/HomeClient";
import { Event } from "@prisma/client";

export default async function Home() {
  const session = await getSession();

  // Fetch all published events
  const events = await prisma.event.findMany({
    where: {
      visibility: "PUBLIC"
    },
    include: {
      tracks: true,
      prizes: true,
      _count: {
        select: { tracks: true }
      }
    },
    orderBy: {
      submissionsCloseAt: 'asc'
    }
  });

  // Serialize Decimal objects
  const serializedEvents = events.map(e => ({
    ...e,
    prizes: e.prizes.map(p => ({
      ...p,
      amount: p.amount ? p.amount.toString() : null
    }))
  }));

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">
      <HomeClient events={serializedEvents as any} session={session} />
    </main>
  );
}

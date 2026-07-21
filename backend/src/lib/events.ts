import { prisma } from "./prisma.js";

/**
 * Queries the database to search for events matching the search query by name or venue.
 * Calculates available seats for each event and returns the events list.
 * If search query is empty/undefined, returns all events.
 */
export async function searchEvents(searchQuery?: string) {
  const events = await prisma.event.findMany({
    where: searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { venue: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { date: "asc" },
    include: {
      _count: { select: { seats: true } },
    },
  });

  const eventsWithAvailability = await Promise.all(
    events.map(async (event: any) => {
      const availableSeats = await prisma.seat.count({
        where: { eventId: event.id, status: "AVAILABLE" },
      });

      return { ...event, availableSeats };
    }),
  );

  return eventsWithAvailability;
}

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { getIntegerId } from "../utils/getIntegerIds";

const createEventSchema = z.object({
  name: z.string().min(2),
  venue: z.string().min(2),
  date: z.string().datetime(),
  totalSeats: z.number().int().min(1).max(10000),
});

const updateEventSchema = createEventSchema.partial();

// GET /api/events/ - get all of the events
const listAllEvents = async (req: Request, res: Response) => {
  try {
    // We will have a query string here when the user searches for an event based on his location name
    /* Using Query strings  */
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: {
        _count: { select: { seats: true } },
      },
    });

    const eventsWithAvailability = await Promise.all(
      events.map(async (event) => {
        const availableSeats = await prisma.seat.count({
          where: { eventId: event.id, status: "AVAILABLE" },
        });

        return { ...event, availableSeats };
      }),
    );
    /* Awaiting all the promises for the events with the seats which are available and their counts of the available seats */

    res.json({ events: eventsWithAvailability });
  } catch (err) {
    console.log("Error while fetching Events", err);
  }
};

// GET /api/events/:eventId - a single event details
const getEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const newId = getIntegerId(eventId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  const event = await prisma.event.findUnique({
    where: { id: newId },
  });

  const availableSeats = prisma.seat.count({
    where: { eventId: newId, status: "AVAILABLE" },
  });

  res.status(201).json({ event: { ...event, availableSeats } });
};

// POST api/events/ - create events + alot Seats
const createAnEvent = async (req: Request, res: Response) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  //   Validate the Schema using ZOD

  const { name, venue, date, totalSeats } = parsed.data;

  const event = await prisma.event.create({
    data: {
      name,
      venue,
      date: new Date(date),
      totalSeats,
      seats: {
        create: Array.from({ length: totalSeats }, (_, i) => ({
          seatNumber: `A${i + 1}`,
        })),
      },
    },
    include: { _count: { select: { seats: true } } },
  });

  res.status(201).json({ event });
};

// PUT api/events/:eventId
const updateAnEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, venue, date, totalSeats } = parsed.data;

  const newId = getIntegerId(eventId);

  try {
    // We use a transaction to ensure everything updates successfully together
    const updatedEvent = await prisma.$transaction(async (tx) => {
      // 1. If totalSeats is being updated, we handle the seat recreation
      if (totalSeats !== undefined) {
        // Delete existing seats first
        await tx.seat.deleteMany({
          where: { eventId: newId },
        });
      }

      // 2. Update the event details
      const event = await tx.event.update({
        where: { id: newId },
        data: {
          ...(name && { name }),
          ...(venue && { venue }),
          ...(date && { date: new Date(date) }),
          ...(totalSeats !== undefined && {
            totalSeats,
            seats: {
              create: Array.from({ length: totalSeats }, (_, i) => ({
                seatNumber: `A${i + 1}`,
              })),
            },
          }),
        },
        include: { _count: { select: { seats: true } } },
      });

      return event;
    });

    res.status(200).json({ event: updatedEvent });
  } catch (error) {
    // Handle cases where the event ID doesn't exist
    res.status(404).json({ error: "Event not found or failed to update" });
  }
};

// DELETE api/events/:eventId
const deleteAnEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const newId = getIntegerId(eventId);

  try {
    await prisma.seat.deleteMany({
      where: { eventId: newId },
    });

    const deletedEvent = await prisma.event.delete({
      where: { id: newId },
    });

    res.status(200).json({
      message: "Event and associated seats deleted successfully",
      event: deletedEvent,
    });
  } catch (error) {
    res.status(404).json({ error: "Event not found" });
  }
};

export { listAllEvents, getEvent, createAnEvent, updateAnEvent, deleteAnEvent };

import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getIntegerId } from "../utils/getIntegerIds.js";
import { redisClient } from "../lib/redis.js";
import { REDIS_KEYS } from "../lib/constants.js";
import { searchEvents } from "../lib/events.js";

// GET /api/events/ - get all of the events (supports ?query=...)
const listAllEvents = async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string | undefined;
    const eventsWithAvailability = await searchEvents(query);
    res.json({ events: eventsWithAvailability });
  } catch (err) {
    console.log("Error while fetching Events", err);
    res.status(500).json({ error: "Failed to fetch events" });
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

  const availableSeats = await prisma.seat.count({
    where: { eventId: newId, status: "AVAILABLE" },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.status(200).json({ event: { ...event, availableSeats } });
};

// POST api/events/ - create events + alot Seats
const createAnEvent = async (req: Request, res: Response) => {
  const { name, venue, date, totalSeats, imageUrl } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        name,
        venue,
        date: new Date(date),
        totalSeats,
        imageUrl,
        seats: {
          create: Array.from({ length: totalSeats }, (_, i) => ({
            seatNumber: `A${i + 1}`,
          })),
        },
      },
      include: { _count: { select: { seats: true } } },
    });

    // Fetch the created seats and cache them in a Redis Hash
    const seats = await prisma.seat.findMany({
      where: { eventId: event.id },
      orderBy: { seatNumber: "asc" },
    });

    const hashKey = REDIS_KEYS.eventSeats(event.id);
    const pipeline = redisClient.pipeline();
    seats.forEach((seat: any) => {
      pipeline.hset(
        hashKey,
        String(seat.id),
        `${seat.seatNumber}:${seat.status}`,
      );
    });
    await pipeline.exec();

    res.status(201).json({ event });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create event" });
  }
};

// PUT api/events/:eventId
const updateAnEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const { name, venue, date, totalSeats, imageUrl } = req.body;
  const newId = getIntegerId(eventId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  try {
    // We use a transaction to ensure everything updates successfully together
    const updatedEvent = await prisma.$transaction(async (tx: any) => {
      // 1. If totalSeats is being updated, we handle the seat recreation
      if (totalSeats !== undefined) {
        // Delete existing seats first
        await tx.seat.deleteMany({
          where: { eventId: newId },
        });
      }

      const event = await tx.event.update({
        where: { id: newId },
        data: {
          ...(name && { name }),
          ...(venue && { venue }),
          ...(imageUrl && { imageUrl }),
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

    // If totalSeats was updated, sync with Redis cache
    if (totalSeats !== undefined) {
      const hashKey = REDIS_KEYS.eventSeats(newId);
      await redisClient.del(hashKey);

      const seats = await prisma.seat.findMany({
        where: { eventId: newId },
        orderBy: { seatNumber: "asc" },
      });

      const pipeline = redisClient.pipeline();
      seats.forEach((seat: any) => {
        pipeline.hset(
          hashKey,
          String(seat.id),
          `${seat.seatNumber}:${seat.status}`,
        );
      });
      await pipeline.exec();
    }

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

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  try {
    await prisma.seat.deleteMany({
      where: { eventId: newId },
    });

    const deletedEvent = await prisma.event.delete({
      where: { id: newId },
    });

    // Delete the Redis cache for this event's seats
    await redisClient.del(REDIS_KEYS.eventSeats(newId));

    res.status(200).json({
      message: "Event and associated seats deleted successfully",
      event: deletedEvent,
    });
  } catch (error) {
    res.status(404).json({ error: "Event not found" });
  }
};

export { listAllEvents, getEvent, createAnEvent, updateAnEvent, deleteAnEvent };

import { Request, Response } from "express";
import { redisClient } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { REDIS_KEYS } from "../lib/constants";
import { getIntegerId } from "../utils/getIntegerIds";

// For frontend Map in order for user to select seats which he wants to book
const getSeatMap = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const newId = getIntegerId(eventId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  const event = await prisma.event.findUnique({ where: { id: newId } });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const seats = await prisma.seat.findMany({
    where: { eventId: newId },
    orderBy: { seatNumber: "asc" },
    select: {
      id: true,
      seatNumber: true,
      status: true,
    },
  });

  // Now a Seat might be locked in redis but still might show available in the Db as we might store it as a cache and then later update out db

  const seatsWithLockStatus = await Promise.all(
    seats.map(async (seat) => {
      if (seat.status === "AVAILABLE") {
        const lockKey = REDIS_KEYS.seatLock(newId, seat.id);
        // This is the coded key got with the help of the helper instance that is REDIS_KEYS in /lib/constants.ts
        const lockedBy = await redisClient.get(lockKey);

        return lockedBy ? { ...seat, status: "LOCKED" as const } : seat;
      }

      return seat;
    }),
  );

  res.status(201).json({ seats: seatsWithLockStatus });

  /* This one is Important --> the DB only has AVAILABLE or BOOKED. The LOCKED state lives in Redis. This endpoint merges both so the frontend seat map is accurate. */
};

export { getSeatMap };

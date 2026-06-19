import { Request, RequestHandler, Response } from "express";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { promoteQueueAndNotify } from "../services/queueService";

import {
  acquireSeatAndLock,
  releaseYourSeatLock,
  getLockHolder,
  getLockTTL,
} from "../services/seatLock.service";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getIntegerId } from "../utils/getIntegerIds";

// POST /api/seats/:eventId/:seatId/lock
const lockSeat: RequestHandler = async (req, res) => {
  const { eventId, seatId } = req.params;
  const authReq = req as AuthRequest;
  const newEventId = getIntegerId(eventId);
  const newSeatId = getIntegerId(seatId);
  const userId = authReq.user?.userId;

  //  Now First Check if a seat Exists (valid Id) and status if available in the database
  const seat = await prisma.seat.findUnique({
    where: { id: newSeatId },
    include: { event: true },
  });

  if (!seat || !userId || seat.eventId !== newEventId) {
    res.status(404).json({ error: "Seat, Event, or User is not Valid" });
    return;
  }

  if (seat.status === "BOOKED") {
    res.status(409).json({ error: "Seat is already booked" });
    return;
  }

  //   Now we checked that if the seat Exists in the database itself the return the user NO
  //  Had the seat existed in the database with the status === "AVAILABLE", it is still not a green light for us to directly lock for seat for our user some other user might still be processing his/her payment in redis server - we now check that

  //   Attempt Atomic Redis Locking
  const locked = await acquireSeatAndLock(seat.eventId, seat.id, userId);
  //   Logic is situated in our Functions

  if (!locked) {
    res.status(409).json({ error: "Seat is currently locked by another user" });
    return;
  }

  // Alright our client now passed Both our tests (DATABASE and redis DB or server)
  // We now start his TTL for a payment window

  const ttl = await getLockTTL(seat.eventId, seat.id);
  res.json({
    message: "Seat locked successfully",
    seatId,
    eventId: seat.eventId,
    lockExpiresIn: ttl, // In Seconds
  });
};

// Controller function for someone if He wants to Unlock His Seat
// DELETE /api/seats/:eventId/:seatId/lock
const unLockSeat: RequestHandler = async (req, res) => {
  const { eventId, seatId } = req.params;
  const authReq = req as AuthRequest;
  const newEventId = getIntegerId(eventId);
  const newSeatId = getIntegerId(seatId);
  const userId = authReq.user?.userId;

  const seat = await prisma.seat.findUnique({ where: { id: newSeatId } });

  if (!seat || !userId || seat.eventId !== newEventId) {
    res.status(404).json({ error: "Seat, Event, or User is not Valid" });
    return;
  }

  const released = await releaseYourSeatLock(seat.eventId, seat.id, userId);

  if (!released) {
    res.status(403).json({ error: "You do not hold the lock on this seat" });
    return;
  }

  // Remove user from active pool when they release their lock, and promote the queue
  const activeKey = REDIS_KEYS.activeUsers(seat.eventId);
  await redisClient.srem(activeKey, String(userId));
  promoteQueueAndNotify(seat.eventId).catch((err) =>
    console.error("Queue promotion failed:", err)
  );

  res.json({ message: "Seat Lock Released", seatId: seat.id });
};

export { unLockSeat, lockSeat };

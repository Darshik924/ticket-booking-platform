import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

import {
  acquireSeatAndLock,
  releaseYourSeatLock,
  getLockHolder,
  getLockTTL,
} from "../services/seatLock.service";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getIntegerId } from "../utils/getIntegerIds";

// POST /api/seats/:seatId/lock
const lockSeat = async (req: AuthRequest, res: Response) => {
  const { seatId } = req.params;
  const newSeatId = getIntegerId(seatId);
  const userId = req.user?.userId;

  //  Now First Check if a seat Exists (valid Id) and status if available in the database
  const seat = await prisma.seat.findUnique({
    where: { id: newSeatId },
    include: { event: true },
  });

  if (!seat || !userId) {
    res.status(404).json({ error: "Seat or User is not Valid" });
    return;
  }

  if (seat.status === "BOOKED") {
    res.status(409).json({ error: "Seat is already booked" });
    return;
  }

  //   Now we checked that if the seat Exists in the database itself the return the user NO
  //  Had the seat existed in the database with the status === "AVAILABLE", it is still not a green light for us to directly lock for seat for our user some other user might still be processing his/her payment in redis server - we now check that

  //   Attempt Atmoic Redis Locking
  const locked = await acquireSeatAndLock(seat.eventId, seat.id, userId);
  //   Logic is situated in our Functions

  if (!locked) {
    res
      .status(409)
      .json({ error: "Seat is currently locked by another user" });
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
// DELETE /api/seats/:seatId/lock
const unLockSeat = async (req: AuthRequest, res: Response) => {
  const { seatId } = req.params;
  const newSeatId = getIntegerId(seatId);
  const userId = req.user?.userId;

  const seat = await prisma.seat.findUnique({ where: { id: newSeatId } });

  if (!seat || !userId) {
    res.status(404).json({ error: "Seat or User is not Valid" });
    return;
  }

  const released = await releaseYourSeatLock(seat.eventId, seat.id, userId);

  if (!released) {
    res.status(403).json({ error: "You do not hold the lock on this seat" });
    return;
  }

  res.json({ message: "Seat Lock Released", seatId: seat.id });
};

export { unLockSeat, lockSeat };

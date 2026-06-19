import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { paymentQueue } from "../lib/bullmq";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getIntegerId } from "../utils/getIntegerIds";

/**
 * Initiates the payment process for a locked seat by pushing a job to BullMQ.
 * POST /api/payment/pay
 */
export const processPaymentHandler: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { eventId, seatId } = req.body;

  if (!eventId || !seatId) {
    return res.status(400).json({
      success: false,
      message: "eventId and seatId are required in the request body",
    });
  }

  const newEventId = getIntegerId(eventId);
  const newSeatId = getIntegerId(seatId);

  try {
    // 1. Verify seat exists and is not already booked in DB
    const seat = await prisma.seat.findUnique({
      where: { id: newSeatId },
    });

    if (!seat) {
      return res.status(404).json({ success: false, message: "Seat not found" });
    }

    if (seat.status === "BOOKED") {
      return res.status(400).json({ success: false, message: "Seat is already booked" });
    }

    // 2. Verify Redis lock ownership (the user must hold the active lock to pay)
    const lockKey = REDIS_KEYS.seatLock(newEventId, newSeatId);
    const lockHolder = await redisClient.get(lockKey);

    if (!lockHolder || Number(lockHolder) !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not hold the lock on this seat, or the payment window has expired",
      });
    }

    // 3. Create or update booking with PENDING status in database
    const booking = await prisma.booking.upsert({
      where: { seatId: newSeatId },
      update: {
        userId,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
      create: {
        userId,
        seatId: newSeatId,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
    });

    // 4. Enqueue the payment job in BullMQ payment queue for background processing
    await paymentQueue.add("processPaymentJob", {
      eventId: newEventId,
      seatId: newSeatId,
      userId,
      bookingId: booking.id,
    });

    // Return 202 Accepted as payment is processing asynchronously
    res.status(202).json({
      success: true,
      message: "Payment request received. Processing booking in the background.",
      bookingId: booking.id,
      status: "PENDING",
    });
  } catch (error) {
    console.error("Payment registration failed:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while initiating payment",
    });
  }
};

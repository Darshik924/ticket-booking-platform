import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { promoteQueueAndNotify } from "./queue.service";
import { getIO } from "../lib/socket";

// Create a background worker to process payment jobs from the "paymentQueue"
const worker = new Worker(
  "paymentQueue",
  async (job) => {
    const { eventId, seatId, userId, bookingId } = job.data;

    console.log(
      `[PaymentWorker] Processing payment for job ${job.id}: user ${userId}, seat ${seatId}`,
    );

    try {
      // 1. Simulate external payment gateway latency (e.g., card charging, bank network delay)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. Perform DB operations atomically using a Prisma transaction
      await prisma.$transaction(async (tx) => {
        // Mark the seat as confirmed booked in DB
        await tx.seat.update({
          where: { id: seatId },
          data: { status: "BOOKED" },
        });

        // Update the booking status to CONFIRMED and payment status to PAID
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
          },
        });
      });

      // Update the seat status in the Redis Hash cache
      const hashKey = REDIS_KEYS.eventSeats(eventId);
      const seatVal = await redisClient.hget(hashKey, String(seatId));
      if (seatVal) {
        const colonIdx = seatVal.indexOf(":");
        const seatNumber = seatVal.substring(0, colonIdx);
        await redisClient.hset(hashKey, String(seatId), `${seatNumber}:BOOKED`);
      }

      // 3. Clean up the Redis seat lock
      const lockKey = REDIS_KEYS.seatLock(eventId, seatId);
      await redisClient.del(lockKey);

      // 4. Remove the user from active pool since they completed their purchase
      const activeKey = REDIS_KEYS.activeUsers(eventId);
      await redisClient.srem(activeKey, String(userId));

      // 5. Trigger waiting room queue promotion to let the next queued user in
      await promoteQueueAndNotify(eventId);

      // 6. Notify the user via WebSockets that their booking is fully confirmed
      const io = getIO();
      io.to(`user:${userId}`).emit("booking_confirmed", {
        success: true,
        bookingId,
        seatId,
        message:
          "Your payment was processed successfully! Your ticket is confirmed.",
      });

      console.log(
        `[PaymentWorker] Payment successfully processed for booking ${bookingId}`,
      );
    } catch (error) {
      console.error(
        `[PaymentWorker] Failed to process payment for booking ${bookingId}:`,
        error,
      );

      // In case of payment failure, mark the booking as CANCELLED and make the seat AVAILABLE again
      try {
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: "CANCELLED",
              paymentStatus: "UNPAID",
            },
          });

          await tx.seat.update({
            where: { id: seatId },
            data: { status: "AVAILABLE" },
          });
        });

        // Update the seat status in the Redis Hash cache
        const hashKey = REDIS_KEYS.eventSeats(eventId);
        const seatVal = await redisClient.hget(hashKey, String(seatId));
        if (seatVal) {
          const colonIdx = seatVal.indexOf(":");
          const seatNumber = seatVal.substring(0, colonIdx);
          await redisClient.hset(
            hashKey,
            String(seatId),
            `${seatNumber}:AVAILABLE`,
          );
        }

        // Remove Redis lock so someone else can lock/buy the seat
        const lockKey = REDIS_KEYS.seatLock(eventId, seatId);
        await redisClient.del(lockKey);

        // Remove from active users pool and promote next in queue
        const activeKey = REDIS_KEYS.activeUsers(eventId);
        await redisClient.srem(activeKey, String(userId));
        await promoteQueueAndNotify(eventId);

        // Notify the user via WebSockets about the payment failure
        const io = getIO();
        io.to(`user:${userId}`).emit("booking_failed", {
          success: false,
          bookingId,
          seatId,
          message: "Payment failed. Your seat lock has been released.",
        });
      } catch (cleanupErr) {
        console.error(
          "[PaymentWorker] Critical error during payment error cleanup:",
          cleanupErr,
        );
      }
    }
  },
  {
    connection: redisClient.options,
  },
);

/* This is the emitted event that will be broadcasted to the specific user when his event will be completed */
worker.on("active", (job) => {
  const { userId, bookingId } = job.data;
  getIO().to(`user:${userId}`).emit("payment_processing", {
    status: "PROCESSING",
    bookingId,
    message: "Your payment is being processed...",
  });
});

console.log(
  "[PaymentWorker] Background worker started listening to paymentQueue",
);

export default worker;

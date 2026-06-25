import { BookingStatus, PrismaClient } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { promoteQueueAndNotify } from "./queueService";
import {
  getLockHolder,
  releaseYourSeatLock,
} from "../services/seatLock.service";

export const createBooking = async (userId: number, seatId: number) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id: seatId,
    },
  });

  if (!seat) {
    throw new Error("Seat not found");
  }

  //verify lock ownerShip
  const lockHolder = await getLockHolder(seat.eventId, seat.id);

  if (!lockHolder || Number(lockHolder) !== userId) {
    throw new Error("You dont own this seat lock");
  }

  if (seat.status !== "AVAILABLE") {
    throw new Error("seat is not AVAILABLE");
  }

  // tx->transaction client -->insure that both the booking and the update of the seat take place together if any fails then both fails
  const booking = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        userId,
        seatId,
      },
    });

    await tx.seat.update({
      where: {
        id: seatId,
      },
      data: {
        status: "BOOKED",
      },
    });
    return booking;
  });

  // Update the seat status in the Redis Hash cache
  const hashKey = REDIS_KEYS.eventSeats(seat.eventId);
  const seatVal = await redisClient.hget(hashKey, String(seatId));
  if (seatVal) {
    const colonIdx = seatVal.indexOf(":");
    const seatNumber = seatVal.substring(0, colonIdx);
    await redisClient.hset(hashKey, String(seatId), `${seatNumber}:BOOKED`);
  }

  // Remove user from active pool after booking completion, and promote the queue
  const activeKey = REDIS_KEYS.activeUsers(seat.eventId);
  await redisClient.srem(activeKey, String(userId));

  promoteQueueAndNotify(seat.eventId).catch((err) =>
    console.error("Queue promotion failed:", err),
  );

  //release a redis lock
  await releaseYourSeatLock(seat.eventId, seat.id, userId);

  return booking;
};

//get your existing bookings
export const getMyBookings = async (userId: number) => {
  const bookings = await prisma.booking.findMany({
    //find many becz oneuser => many bookings
    where: {
      userId,
    },
    include: {
      seat: {
        include: {
          event: true,
        },
      },
    },
  });

  return bookings;
};

export const getBookingById = async (BookingId: number, userId: number) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: BookingId,
    },
    include: {
      seat: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return booking;
};

//cancle your booking
export const cancelBooking = async (bookingId: number, userId: number) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      seat: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new Error("Unathorised");
  }

  // tx -> transaction client  both bookings cancelled and seat available again should happen together if any fails then both fails
  const updateBooking = await prisma.$transaction(async (tx) => {
    //update booking status to cancelled
    const updateBooking = await tx.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    // make the seat available again
    await tx.seat.update({
      where: {
        id: booking.seatId, //remember that seatId is not a bookingId
      },
      data: {
        status: "AVAILABLE",
      },
    });
    return updateBooking;
  });

  // Update the seat status in the Redis Hash cache
  if (booking.seat) {
    const hashKey = REDIS_KEYS.eventSeats(booking.seat.eventId);
    const seatVal = await redisClient.hget(hashKey, String(booking.seatId));
    if (seatVal) {
      const colonIdx = seatVal.indexOf(":");
      const seatNumber = seatVal.substring(0, colonIdx);
      await redisClient.hset(
        hashKey,
        String(booking.seatId),
        `${seatNumber}:AVAILABLE`,
      );
    }
  }

  return updateBooking;
};

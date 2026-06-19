import { BookingStatus, PrismaClient } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { promoteQueueAndNotify } from "./queueService";

export const createBooking = async (userId: number, seatId: number) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id: seatId,
    },
  });

  if (!seat) {
    throw new Error("Seat not found");
  }

  if (seat.status !== "AVAILABLE") {
    throw new Error("seat is not AVAILABLE");
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      seatId,
    },
  });

  await prisma.seat.update({
    where: {
      id: seatId,
    },
    data: {
      status: "BOOKED",
    },
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
    console.error("Queue promotion failed:", err)
  );

  return booking;
};

export const getMyBookings = async (userId: number) => {
  const bookings = await prisma.booking.findMany({
    //find many becz oneuser => many bookings
    where: {
      userId,
    },
    include: {
      seat: true,
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

  const updateBooking = await prisma.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      status: "CANCELLED",
    },
  });
  await prisma.seat.update({
    where: {
      id: booking.seatId,
    },
    data: {
      status: "AVAILABLE",
    },
  });

  // Update the seat status in the Redis Hash cache
  if (booking.seat) {
    const hashKey = REDIS_KEYS.eventSeats(booking.seat.eventId);
    const seatVal = await redisClient.hget(hashKey, String(booking.seatId));
    if (seatVal) {
      const colonIdx = seatVal.indexOf(":");
      const seatNumber = seatVal.substring(0, colonIdx);
      await redisClient.hset(hashKey, String(booking.seatId), `${seatNumber}:AVAILABLE`);
    }
  }

  return updateBooking;
};

import { Request, Response } from "express";
import { redisClient } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { REDIS_KEYS, MAX_ACTIVE_USERS } from "../lib/constants";
import { getIntegerId } from "../utils/getIntegerIds";
import { AuthRequest } from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken";

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

  const authReq = req as AuthRequest;
  let queueUserId: string;
  let newGuestCreated = false;
  let guestSessionId: string | undefined;

  // Optional authentication: check if a valid token is provided
  const authHeader = req.headers.authorization;
  let token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];

  if (!token && authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];
  }

  let authenticatedUserId: number | undefined;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: number;
        email: string;
      };
      authenticatedUserId = decoded.userId;
    } catch {
      // Ignore invalid or expired token, treat as guest
    }
  }

  if (authReq.user?.userId) {
    queueUserId = String(authReq.user.userId);
  } else if (authenticatedUserId) {
    queueUserId = String(authenticatedUserId);
  } else {
    guestSessionId = req.headers["x-guest-session-id"] as string;
    if (!guestSessionId) {
      guestSessionId = req.headers.cookie?.match(/guest_session=([^;]+)/)?.[1];
    }
    if (!guestSessionId) {
      guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      newGuestCreated = true;
    }
    queueUserId = guestSessionId;
  }

  const queueKey = REDIS_KEYS.waitingQueue(newId);
  const activeKey = REDIS_KEYS.activeUsers(newId);

  // Check if user (auth or guest) is already in active pool
  let isActive = await redisClient.sismember(activeKey, queueUserId);

  if (!isActive) {
    // Push them to the Redis sorted set (waiting queue) with timestamp as score only if they don't exist
    await redisClient.zadd(queueKey, "NX", Date.now(), queueUserId);

    // Try to promote users from queue to active pool
    const activeCount = await redisClient.scard(activeKey);
    if (activeCount < MAX_ACTIVE_USERS) {
      const vacancies = MAX_ACTIVE_USERS - activeCount;
      // Fetch the top users in queue up to number of vacancies
      const nextUsers = await redisClient.zrange(queueKey, 0, vacancies - 1);
      if (nextUsers.length > 0) {
        await redisClient.sadd(activeKey, ...nextUsers);
        await redisClient.zrem(queueKey, ...nextUsers);
      }
    }

    // Recheck if our user was promoted
    isActive = await redisClient.sismember(activeKey, queueUserId);

    if (!isActive) {
      // Set the guest_session cookie if it was newly created
      if (newGuestCreated && guestSessionId) {
        res.cookie("guest_session", guestSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
        });
      }

      // Still in queue, get queue position
      const rank = await redisClient.zrank(queueKey, queueUserId);
      const queuePosition = rank !== null ? rank + 1 : 1;
      return res.status(202).json({
        status: "WAITING",
        queuePosition,
        message: "You are in the waiting queue.",
      });
    }
  }

  // Set the guest_session cookie if it was newly created and user is active
  if (newGuestCreated && guestSessionId) {
    res.cookie("guest_session", guestSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });
  }

  // User is ACTIVE, serve seat map directly from Redis
  const hashKey = REDIS_KEYS.eventSeats(newId);
  let seatsData = await redisClient.hgetall(hashKey);

  // Fallback/Lazy-load: if Redis Hash is empty, fetch from database and populate cache
  if (Object.keys(seatsData).length === 0) {
    const seatsFromDb = await prisma.seat.findMany({
      where: { eventId: newId },
      orderBy: { seatNumber: "asc" },
      select: {
        id: true,
        seatNumber: true,
        status: true,
      },
    });

    if (seatsFromDb.length > 0) {
      const pipeline = redisClient.pipeline();
      seatsFromDb.forEach((seat) => {
        pipeline.hset(
          hashKey,
          String(seat.id),
          `${seat.seatNumber}:${seat.status}`,
        );
      });
      await pipeline.exec();

      seatsData = seatsFromDb.reduce((acc: any, seat) => {
        acc[String(seat.id)] = `${seat.seatNumber}:${seat.status}`;
        return acc;
      }, {});
    }
  }

  // Parse seats from the hgetall result (lightweight format: seatNumber:status)
  const seats = Object.entries(seatsData).map(([seatId, value]: [string, any]) => {
    const colonIdx = value.indexOf(":");
    const seatNumber = value.substring(0, colonIdx);
    const status = value.substring(colonIdx + 1);
    return {
      id: Number(seatId),
      seatNumber,
      status: status as any,
    };
  });

  // Natural sort by seatNumber (e.g. A1, A2, A10)
  seats.sort((a: any, b: any) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));

  // Retrieve lock status for all seats in a single MGET call to avoid N round-trips
  const lockKeys = seats.map((seat) => REDIS_KEYS.seatLock(newId, seat.id));
  const lockHolders = lockKeys.length > 0 ? await redisClient.mget(...lockKeys) : [];

  // Reconcile and perform self-healing cache updates using a pipeline in the background
  const healingPipeline = redisClient.pipeline();
  let needsHealing = false;

  const seatsWithLockStatus = seats.map((seat, index) => {
    const lockedBy = lockHolders[index];

    if (seat.status === "LOCKED") {
      if (!lockedBy) {
        // Lock has expired! Update status back to AVAILABLE in background
        const updatedSeat = { ...seat, status: "AVAILABLE" as const };
        healingPipeline.hset(hashKey, String(seat.id), `${seat.seatNumber}:AVAILABLE`);
        needsHealing = true;
        return updatedSeat;
      }
      return seat;
    }

    if (seat.status === "AVAILABLE") {
      if (lockedBy) {
        // Lock exists but Hash wasn't updated. Return LOCKED and update Hash
        const updatedSeat = { ...seat, status: "LOCKED" as const };
        healingPipeline.hset(hashKey, String(seat.id), `${seat.seatNumber}:LOCKED`);
        needsHealing = true;
        return updatedSeat;
      }
      return seat;
    }

    return seat;
  });

  if (needsHealing) {
    healingPipeline.exec().catch((err) => console.error("Self-healing cache sync failed:", err));
  }

  res.status(200).json({
    status: "ACTIVE",
    seats: seatsWithLockStatus,
  });
};

export { getSeatMap };

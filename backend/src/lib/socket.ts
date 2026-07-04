import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { redisClient } from "./redis";
import { REDIS_KEYS } from "./constants";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      // 1. Swap the "*" wildcard out for your exact frontend URL
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      
      // 2. Explicitly allow credentials/cookies to pass through
      credentials: true,
      
      methods: ["GET", "POST"],
    },
  });

  // ... (leave the rest of your middleware and connection logic exactly the same)

  // JWT Middleware for Socket.IO Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: number;
        email: string;
      };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected to socket: ${userId}`);

    // Join a user-specific room for direct, isolated notifications
    socket.join(`user:${userId}`);

    // Listen for client joining specific event waiting rooms
    socket.on("join_event_queue", (eventId: number | string) => {
      socket.data.eventId = eventId;
      socket.join(`event_queue:${eventId}`);
      console.log(`User ${userId} joined event queue room: ${eventId}`);
    });

    socket.on("leave_event_queue", async (eventId: number | string) => {
      const eId = Number(eventId);
      const queueKey = REDIS_KEYS.waitingQueue(eId);
      const activeKey = REDIS_KEYS.activeUsers(eId);

      await redisClient.zrem(queueKey, String(userId));
      await redisClient.srem(activeKey, String(userId));

      socket.leave(`event_queue:${eventId}`);
      console.log(`User ${userId} explicitly left event queue room: ${eventId}`);

      // Promote next user in line
      const { promoteQueueAndNotify } = await import("../services/queueService");
      await promoteQueueAndNotify(eId);
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected from socket: ${userId}`);
      const eventId = socket.data.eventId;
      if (eventId) {
        const eId = Number(eventId);
        const queueKey = REDIS_KEYS.waitingQueue(eId);
        const activeKey = REDIS_KEYS.activeUsers(eId);

        await redisClient.zrem(queueKey, String(userId));
        await redisClient.srem(activeKey, String(userId));

        // Promote next user in line
        const { promoteQueueAndNotify } = await import("../services/queueService");
        await promoteQueueAndNotify(eId);
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

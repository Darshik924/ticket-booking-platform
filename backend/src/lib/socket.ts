import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { redisClient } from "./redis.js";
import { REDIS_KEYS } from "./constants.js";

let io: Server;

export const initSocket = (server: HttpServer) => {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_ALT,
    "http://localhost:3000",
    "http://localhost:4000",
  ].filter(Boolean) as string[];

  const allowedOrigins = rawOrigins.map((origin) => origin.replace(/\/$/, ""));

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.length === 0 || allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        console.warn(`[Socket CORS] Origin '${origin}' allowed as fallback for deployment`);
        return callback(null, true);
      },
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

    socket.on("join_seat_map", (eventId: string) => {
      socket.join(`seat_map:${eventId}`);
      console.log(`User ${userId} joined seat map room: ${eventId}`);
    });

    socket.on("leave_event_queue", async (eventId: number | string) => {
      const eId = Number(eventId);
      const queueKey = REDIS_KEYS.waitingQueue(eId);
      const activeKey = REDIS_KEYS.activeUsers(eId);

      await redisClient.zrem(queueKey, String(userId));
      await redisClient.srem(activeKey, String(userId));

      socket.leave(`event_queue:${eventId}`);
      console.log(
        `User ${userId} explicitly left event queue room: ${eventId}`,
      );

      // Promote next user in line
      const { promoteQueueAndNotify } =
        await import("../services/queue.service");
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
        const { promoteQueueAndNotify } =
          await import("../services/queue.service");
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

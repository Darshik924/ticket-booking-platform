import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ connection — separate instance, BullMQ manages this itself
export const bullMQConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // required by BullMQ
});

// General purpose Redis client — for Lua scripts, seat locks, queue positions
export const redisClient = new Redis(REDIS_URL);

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.error("Redis error:", err));

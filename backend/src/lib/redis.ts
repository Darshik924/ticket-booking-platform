import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// BullMQ connection — separate instance, BullMQ manages this itself
export const bullMQConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // required by BullMQ
});

// General purpose Redis client — for Lua scripts, seat locks, queue positions
export const redisClient = new Redis(REDIS_URL);

export const clearExistingQueues = async () => {
  try {
    const patterns = ["waiting_queue:*", "active_users:*"];
    let deletedCount = 0;

    for (const pattern of patterns) {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await redisClient.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== "0");
    }

    if (deletedCount > 0) {
      console.log(`[Redis Startup] Cleaned up ${deletedCount} existing queue/active pool keys.`);
    } else {
      console.log(`[Redis Startup] No existing queue/active pool keys found to clean.`);
    }
  } catch (err) {
    console.error("[Redis Startup] Failed to clear existing queues:", err);
  }
};

redisClient.on("connect", () => {
  console.log("Redis connected");
  clearExistingQueues();
});
redisClient.on("error", (err) => console.error("Redis error:", err));

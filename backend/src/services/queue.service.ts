import { redisClient } from "../lib/redis";
import { REDIS_KEYS, MAX_ACTIVE_USERS } from "../lib/constants";
import { getIO } from "../lib/socket";

/**
 * Promotes waiting users from the queue to the active set if there are vacancies,
 * and notifies all affected users (promoted and remaining) via WebSockets.
 */
export const promoteQueueAndNotify = async (eventId: number): Promise<void> => {
  const queueKey = REDIS_KEYS.waitingQueue(eventId);
  const activeKey = REDIS_KEYS.activeUsers(eventId);
  const io = getIO();

  // 1. Get current active users count
  const activeCount = await redisClient.scard(activeKey);
  const vacancies = MAX_ACTIVE_USERS - activeCount;

  if (vacancies > 0) {
    // 2. Fetch the top users in queue up to number of vacancies
    const nextUsers = await redisClient.zrange(queueKey, 0, vacancies - 1);

    if (nextUsers.length > 0) {
      // Promote users to active pool
      await redisClient.sadd(activeKey, ...nextUsers);
      await redisClient.zrem(queueKey, ...nextUsers);

      // Notify promoted users via their user-specific rooms
      for (const userId of nextUsers) {
        io.to(`user:${userId}`).emit("queue_promoted", {
          status: "ACTIVE",
          message: "You have been promoted to active. You can now view the seat map and book.",
        });
      }
    }
  }

  // 3. Fetch all remaining users in the queue to update their positions
  const remainingUsers = await redisClient.zrange(queueKey, 0, -1);

  // Send real-time position updates to each remaining user in the queue
  remainingUsers.forEach((userId, index) => {
    const queuePosition = index + 1;
    io.to(`user:${userId}`).emit("queue_update", {
      status: "WAITING",
      queuePosition,
      message: `Your updated queue position is ${queuePosition}.`,
    });
  });

  // Also broadcast the line movement to the general event queue room (optional, for general logging)
  io.to(`event_queue:${eventId}`).emit("queue_moved", {
    remainingCount: remainingUsers.length,
    activeCount: await redisClient.scard(activeKey),
  });
};

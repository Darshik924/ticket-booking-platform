const REDIS_KEYS = {
  seatLock: (eventId: number, seatId: number) =>
    `seat_lock:${eventId}:${seatId}`,

  waitingQueue: (eventId: number) => `waiting_queue:${eventId}`,

  activeUsers: (eventId: number) => `active_users:${eventId}`,

  eventSeats: (eventId: number) => `event_seats:${eventId}`,
};

export const LOCK_TTL_SECONDS = 300; // 5 minutes
export const MAX_ACTIVE_USERS = 1; // Max Users that are allowed past waiting room at once
export const QUEUE_POLL_INTERVAL_MS = 5000; // How often frontend will polls queue position
export const QUEUE_TTL_SECONDS = 86400; // 24 hours


export { REDIS_KEYS };

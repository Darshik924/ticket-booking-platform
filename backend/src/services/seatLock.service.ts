import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS, LOCK_TTL_SECONDS } from "../lib/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the Lua Scripts Once as soon as Start
const lockScript = fs.readFileSync(
  join(__dirname, "../lib/scripts/lockSeat.lua"),
  "utf8",
);

const releaseScript = fs.readFileSync(
  join(__dirname, "../lib/scripts/releaseLock.lua"),
  "utf8",
);

// Services and Executable functions to Execute the EVAL command + getting lockHolders/lockTTls in the redis console

const acquireSeatAndLock = async (
  eventId: number,
  seatId: number,
  userId: number,
): Promise<boolean> => {
  const key = REDIS_KEYS.seatLock(eventId, seatId);
  const hashKey = REDIS_KEYS.eventSeats(eventId);

  const result = await redisClient.eval(
    lockScript,
    2,
    key,
    hashKey,
    userId,
    String(LOCK_TTL_SECONDS),
    String(seatId),
  );

  return result === 1;
};

const releaseYourSeatLock = async (
  eventId: number,
  seatId: number,
  userId: number,
): Promise<boolean> => {
  const key = REDIS_KEYS.seatLock(eventId, seatId);
  const hashKey = REDIS_KEYS.eventSeats(eventId);

  const result = await redisClient.eval(
    releaseScript,
    2,
    key,
    hashKey,
    userId,
    String(seatId),
  );

  return result === 1;
};

const getLockHolder = async (
  eventId: number,
  seatId: number,
): Promise<string | null> => {
  const key = REDIS_KEYS.seatLock(eventId, seatId);
  return redisClient.get(key);
};

const getLockTTL = async (eventId: number, seatId: number): Promise<number> => {
  const key = REDIS_KEYS.seatLock(eventId, seatId);
  return redisClient.ttl(key); // This will return us the number of the seconds remaining, and it returns -2 if the key doesnt exists
};

export { acquireSeatAndLock, getLockHolder, getLockTTL, releaseYourSeatLock };

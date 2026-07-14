import { prisma } from "./src/lib/prisma.ts";
import { redisClient } from "./src/lib/redis.ts";

async function main() {
  const eventId = 5;
  const hashKey = `event_seats:${eventId}`;
  const seatsData = await redisClient.hgetall(hashKey);
  console.log("redisCount", Object.keys(seatsData).length);
  const seats = await prisma.seat.findMany({
    where: { eventId },
    orderBy: { seatNumber: "asc" },
    select: { id: true, seatNumber: true, status: true },
  });
  console.log("dbCount", seats.length);
  console.log("dbFirst3", seats.slice(0, 3));
  await prisma.$disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

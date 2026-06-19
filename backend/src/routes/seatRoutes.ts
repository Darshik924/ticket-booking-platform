import express from "express";
import { lockSeat, unLockSeat } from "../controllers/seatLockController";
import { authenticateUser } from "../middlewares/authMiddleware";

const seatRouter = express.Router();

seatRouter.post("/:eventId/:seatId/lock", authenticateUser, lockSeat);
seatRouter.delete("/:eventId/:seatId/lock", authenticateUser, unLockSeat);
// The seatId route parameter should be the seat id of the seat (of the seat in the database) and nothing like the A2 or A3 number of their 2 or 3 number NO.

export default seatRouter;

// Verify in Bash if the seat has been locked in redis correctly and can also try locking someone else seat or try releasing someone else's seat
//  use
// redis-cli GET seat_lock:<eventId>:<seatId>
// redis-cli TTL seat_lock:<eventId>:<seatId>

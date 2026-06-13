import express from "express";
import { lockSeat, unLockSeat } from "../controllers/seatLockController";
import { authenticateUser } from "../middlewares/authMiddleware";

const seatRouter = express.Router();

seatRouter.post("/:seatId/lock", authenticateUser, lockSeat);
seatRouter.delete("/:seatId/lock", authenticateUser, unLockSeat);

export default seatRouter;

// Verify in Bash if the seat has been locked in redis correctly and can also try locking someone else seat or try releasing someone else's seat
//  use
// redis-cli GET seat_lock:<eventId>:<seatId>
// redis-cli TTL seat_lock:<eventId>:<seatId>

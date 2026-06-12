import { Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware";

import {
  createBookingHandler,
  getMyBookingsHandler,
  getBookingByIdHandler,
  cancelBookingHandler,
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.post("/", authenticateUser, createBookingHandler);

// Get all bookings of logged-in user
router.get("/my", authenticateUser, getMyBookingsHandler);

// Get a specific booking by booking id
router.get("/:id", authenticateUser, getBookingByIdHandler);

// cancel your bookings
router.delete("/:id", authenticateUser, cancelBookingHandler);

export default router;

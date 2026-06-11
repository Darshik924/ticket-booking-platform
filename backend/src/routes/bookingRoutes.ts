import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";

import {
  createBookingHandler,
  getMyBookingsHandler,
  getBookingByIdHandler,
  cancelBookingHandler,
} from "../controllers/bookingController";

const router = Router();

// Create a new booking
router.post("/", authenticate, createBookingHandler);

// Get all bookings of logged-in user
router.get("/my", authenticate, getMyBookingsHandler);

// Get a specific booking by booking id
router.get("/:id", authenticate, getBookingByIdHandler);

// cancel your bookings
router.delete("/:id", authenticate, cancelBookingHandler);

export default router;

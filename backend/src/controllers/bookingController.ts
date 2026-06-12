//talks to server

import { Request, Response } from "express";
import { createBooking } from "../services/bookingService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getMyBookings } from "../services/bookingService";
import { success } from "zod";
import { getBookingById } from "../services/bookingService";
import { cancelBooking } from "../services/bookingService";

export const createBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { seatId } = req.body;

    const booking = await createBooking(userId, seatId);

    res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};

export const getMyBookingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId; //gives logged-in user

    const bookings = await getMyBookings(userId); //fetch only the above received only one userId

    res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getBookingByIdHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const bookingId = Number(req.params.id);

    const userId = req.user!.userId;

    const booking = await getBookingById(bookingId, userId);

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};

export const cancelBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    //booking id from URL
    const bookingId = Number(req.params.id);

    //logged in user id from jwt
    const userId = req.user!.userId;

    const booking = await cancelBooking(bookingId, userId);

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};

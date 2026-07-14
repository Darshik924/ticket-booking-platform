//talks to server

import { RequestHandler, Response } from "express";
import { createBooking } from "../services/booking.service";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getMyBookings } from "../services/booking.service";
import { success } from "zod";
import { getBookingById } from "../services/booking.service";
import { cancelBooking } from "../services/booking.service";

export const getMyBookingsHandler: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    const userId = authReq.user?.userId; // gives logged in User
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const bookings = await getMyBookings(userId); // fetch only the above recieved only

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

export const getBookingByIdHandler: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    const bookingId = Number(req.params.id);
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

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

export const cancelBookingHandler: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    //booking id from URL
    const bookingId = Number(req.params.id);
    // logged in user from jwt
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

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

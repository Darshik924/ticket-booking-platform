// changes User model
// This file contains the authentication controller functions for handling user registration, login, and profile retrieval. It uses the authService functions to perform the necessary operations and sends appropriate HTTP responses based on the outcomes.
import { Request, Response } from "express";
import { registerUser } from "../services/authService";
import { loginUser } from "../services/authService";
import { AuthRequest } from "../middlewares/authMiddleware";

// Controller function to handle user registration
export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await registerUser(
      name,
      email,
      password
    );

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// Controller function to handle user login
export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const data = await loginUser(
      email,
      password
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// Controller function to get the authenticated user's profile
export const getProfile = async (
  req: AuthRequest,
  res: Response
) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
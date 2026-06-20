// changes User model
// This file contains the authentication controller functions for handling user registration, login, and profile retrieval. It uses the authService functions to perform the necessary operations and sends appropriate HTTP responses based on the outcomes.
import { Request, RequestHandler, Response } from "express";
import { registerUser } from "../services/authService";
import { loginUser } from "../services/authService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { generateToken } from "../utils/jwtToken";
import { prisma } from "../lib/prisma";

// Controller function to handle user registration
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await registerUser(name, email, password);

    const token = generateToken(user.id, user.email);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Controller function to handle user login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const data = await loginUser(email, password);
    const { token, user } = data;

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// Controller function to get the authenticated user's profile
const getProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true, role: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(200).json({
    success: true,
    user,
  });
};

export { getProfile };

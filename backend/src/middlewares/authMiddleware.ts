//this middleware will be used to protect routes that require authentication. It checks for the presence of a JWT token in the Authorization header, verifies it, and attaches the decoded user information to the request object for use in subsequent handlers.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { success } from "zod";

// Define a custom request type that includes the user informationfrom the JWT token
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

// Middleware to authenticate requests
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    res.status(401).json({
      success: false,
      message: "Token missing",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
    };

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

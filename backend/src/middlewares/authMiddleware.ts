//this middleware will be used to protect routes that require authentication. It checks for the presence of a JWT token in the Authorization header, verifies it, and attaches the decoded user information to the request object for use in subsequent handlers.
import { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// Define a custom request type that includes the user information from the JWT token
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    name?: string;
    email: string;
    role?: string;
  };
}

// Middleware to authenticate requests
export const authenticateUser: RequestHandler = async (
  req,
  res,
  next,
): Promise<void> => {
  const authReq = req as AuthRequest; // By doing this we only tell TS that treat this same object as having user

  const authHeader = authReq.headers.authorization;

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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    authReq.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const adminAuthenticate: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;

  if (authReq.user && authReq.user.role === "ADMIN") {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized for Admin" });
  }
};

export { adminAuthenticate };

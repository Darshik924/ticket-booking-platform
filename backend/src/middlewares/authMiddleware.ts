//this middleware will be used to protect routes that require authentication. It checks for the presence of a JWT token in the Authorization header, verifies it, and attaches the decoded user information to the request object for use in subsequent handlers.
import { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

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
  const authReq = req as AuthRequest;

  const authHeader = authReq.headers.authorization;
  let token = authReq.headers.cookie?.match(/token=([^;]+)/)?.[1];

  if (!token && authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: "Token missing" });
    return;
  }

  let decoded: { userId: number; email: string };

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
    };
  } catch (jwtError) {
    // If it fails here, the token is genuinely bad or expired
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
    return;
  }

  // 2. Perform DB lookups outside the JWT catch-block
  try {
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
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }

    authReq.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (dbError) {
    // This exposes database connection pool issues during your load test!
    console.error("❌ Auth Middleware DB Failure:", dbError);
    res.status(500).json({
      success: false,
      message: "Database connection timeout during authentication",
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

import { Router } from "express";
import {
  register,
  login,
  getProfile,
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Register new user
router.post("/register", register);

// Login user and return JWT token
router.post("/login", login);

// Get current logged-in user profile
router.get("/me", authenticate, getProfile);

export default router;
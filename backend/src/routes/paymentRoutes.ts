import { Router } from "express";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import { processPaymentHandler } from "../controllers/paymentController.js";

const router = Router();

// Endpoint for users to pay for a locked seat
router.post("/pay", authenticateUser, processPaymentHandler);

export default router;

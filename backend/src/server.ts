import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import eventRouter from "./routes/eventRoutes.js";
import seatRouter from "./routes/seatRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import { redisClient } from "./lib/redis.js";
import passport from "passport";
import "./config/passport.js"; // Fixed extension

import { createServer } from "http";
import { initSocket } from "./lib/socket.js"; // Fixed extension
import "./services/PaymentWorker.js"; // Fixed extension

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();

    res.json({
      status: "ok",
      redis: "connected",
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: String(err) });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRouter);
app.use("/api/seats", seatRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/payment", paymentRouter);

const PORT = process.env.PORT || 5000;

const server = createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
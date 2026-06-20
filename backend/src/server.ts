import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import eventRouter from "./routes/eventRoutes";
import seatRouter from "./routes/seatRoutes";
import bookingRouter from "./routes/bookingRoutes";
import paymentRouter from "./routes/paymentRoutes";
import { redisClient } from "./lib/redis";
import passport from "passport";
import "./config/passport";

import { createServer } from "http";
import { initSocket } from "./lib/socket";
import "./services/PaymentWorker";

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

// Use All Your Routings
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRouter);
app.use("/api/seats", seatRouter);
<<<<<<< HEAD
app.use("/api/booking", bookingRouter);
app.use("/api/payment", paymentRouter);
=======
app.use("/api/bookings", bookingRouter);
>>>>>>> origin/main

const PORT = process.env.PORT || 5000;

const server = createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});


/* Envoirnment Vairbles */
// DATABASE_URL=your_postgresql_db_url
// PORT=
// JWT_SECRET=your_jwt_secret_key
// JWT_EXPIRES_IN=7d
// REDIS_URL=your_redis_url
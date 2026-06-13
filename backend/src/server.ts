import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import eventRouter from "./routes/eventRoutes";
import { redisClient } from "./lib/redis";
import passport from "passport";
import "./config/passport";

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

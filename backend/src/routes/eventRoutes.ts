import { resolveAny } from "dns";
import express from "express";

const eventRouter = express.Router();

eventRouter.get("/", (req, res) => {
  res.json({ message: "okay" });
});
// Get all the events for ther users

eventRouter.post("/", (req, res) => {
  res.json({ message: "okay" });
});

eventRouter.put("/:id", (req, res) => {
  res.json({ message: "HEll" });
});

eventRouter.delete("/:id", (req, res) => {
  res.json({ message: "HEll" });
});

// POST	/api/events	Private/Admin
// PUT	/api/events/:id	Private/Admin
// DELETE	/api/events/:id	Private/Admin

export default eventRouter;

import express from "express";
import {
  getEvent,
  createAnEvent,
  listAllEvents,
  updateAnEvent,
  deleteAnEvent,
} from "../controllers/eventController";

const eventRouter = express.Router();
// Get all the events for ther users

eventRouter.get("/", listAllEvents);
eventRouter.get("/:id", getEvent);

eventRouter.post("/", createAnEvent);
eventRouter.put("/:id", updateAnEvent);
eventRouter.delete("/:id", deleteAnEvent);
// So here we will need an admin middleware and stuff which i have not put for now since we will need to hardCode that later and also in the database need to make an admin account for ther CRUD ops of the Events + Seats 
// Date Format need to provide is 2026-06-11T14:30:00.000Z

export default eventRouter;

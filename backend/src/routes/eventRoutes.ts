import express from "express";
import {
  getEvent,
  createAnEvent,
  listAllEvents,
  updateAnEvent,
  deleteAnEvent,
} from "../controllers/eventController";
import {
  adminAuthenticate,
  authenticateUser,
} from "../middlewares/authMiddleware";
import { getSeatMap } from "../controllers/seatController";

const eventRouter = express.Router();
// Get all the events for ther users

/* We will make a different home Page for to show some other data */
/* In order to get all the events we user can see it directly  */

/* But when he wants to book a ticket he must Login first so we will keep only the listAllEvents route to be public and all the others to be private (or for a logged in user) */

eventRouter.get("/", listAllEvents);
eventRouter.get("/:eventId", getEvent);

// These are the Admin routes which only an admin account will be able to access and perform operations as we dont want users hitting requests for changing the details for an event
eventRouter.post("/", authenticateUser, adminAuthenticate, createAnEvent);
eventRouter.put("/:eventId", authenticateUser, adminAuthenticate, updateAnEvent);
eventRouter.delete("/:eventId", authenticateUser, adminAuthenticate, deleteAnEvent);
// Date Format need to provide is 2026-06-11T14:30:00.000Z
// We have The Logical part of the Events + Seats Done check it Once 

eventRouter.get("/:eventId/seats", getSeatMap);

export default eventRouter;

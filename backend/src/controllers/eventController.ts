import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const getAllEvents = async (req: Request, res: Response) => {
  try {
    // We will have a query string here when the user searches for an event based on his location name
    /* Using Query strings  */

  } catch (err) {
    console.log("Error while fetching Events", err);
  }
};

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { getIntegerId } from "../utils/getIntegerIds";
import { redisClient } from "../lib/redis";
import { REDIS_KEYS } from "../lib/constants";
import { Int32 } from "mongoose";

const sectionPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  figure: z.enum(['line', 'arc']),
  radius: z.number().optional(),
  inverted: z.number().int().optional(),
  remaining: z.number().int().optional(),
});

const seatDataSchema = z.object({
  seatName: z.string().min(1),
  seatPrice: z.string().min(1),
  seatTier: z.string().min(1),
  x: z.number(),
  y: z.number(),
})

const seatSchema = z.object({
  angle: z.number(),
  colGap: z.number(),
  columns: z.number().int(),
  groupX: z.number(),
  groupY: z.number(),
  layoutRadius: z.number(),
  rowGap: z.number(),
  rows: z.number().int(),
  seatRadius: z.number(),
  seat_data: z.record(z.string(), seatDataSchema),
  type: z.enum(['linear', 'arc', 'arcFixed']),
})

const sectionSchema = z.object({
  color: z.string(),
  d: z.string(),
  name: z.string(),
  points: z.record(z.string(), sectionPointSchema),
  price: z.string(),
  seats: z.record(z.string(), seatSchema),
  textAngle: z.number(),
  textFont: z.number(),
  textX: z.number(),
  textY: z.number(),
  totalSeats: z.number().int().optional().nullable()
});


const createEventSchema = z
  .object({
    ageLimit: z.string(),
    category: z.string(),
    description: z.string(),
    duration: z.string(),
    endDate: z.string(),
    seatLayout: z.record(z.string(), sectionSchema),
    startDate: z.string(),
    tag: z.string(),
    title: z.string(),
    venueAddress: z.string().optional(),
    venueCity: z.string().optional(),
    venueCountry: z.string().optional(),
    venueId: z.number().int().nullable(),
    venueName: z.string().optional(),
    venuePincode: z.string().optional(),
    venueState: z.string().optional(),
  })
  .refine(
    (data) => (data.venueId || data.venueName),
    {
      message: "Either venue details or venue id is required",
    }
  );

// const updateEventSchema = createEventSchema.partial();

// GET /api/events/ - get all of the events
const listAllEvents = async (req: Request, res: Response) => {
  try {
    // We will have a query string here when the user searches for an event based on his location name
    /* Using Query strings  */
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true
      }
    });
    /* Awaiting all the promises for the events with the seats which are available and their counts of the available seats */

    res.json({ events });
  } catch (err) {
    console.log("Error while fetching Events", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

const listAllVenues = async (req: Request, res: Response) => {
  try {
    // We will have a query string here when the user searches for an event based on his location name
    /* Using Query strings  */
    const venues = await prisma.venue.findMany({});
    /* Awaiting all the promises for the events with the seats which are available and their counts of the available seats */

    res.json({ venues });
  } catch (err) {
    console.log("Error while fetching venues", err);
  }
};
// GET /api/events/:eventId - a single event details
const getEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const newId = getIntegerId(eventId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  const event = await prisma.event.findUnique({
    where: { id: newId },
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.status(200).json({ event });
};

// GET /api/events/venue/:venueId - a single venue details
const getVenue = async (req: Request, res: Response) => {
  const { venueId } = req.params;

  const newId = getIntegerId(venueId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: newId },
  });

  if (!venue) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.status(200).json({ venue });
};

// POST api/events/ - create events + alot Seats
const createAnEvent = async (req: Request, res: Response) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log(parsed)
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  // Validate the Schema using ZOD

  const eventData = parsed.data;

  try {
    if (!eventData.venueId) {
      const venue = await prisma.venue.create(
        {
          data: {
            name: eventData.venueName as string,
            address: eventData.venueAddress as string,
            country: eventData.venueCountry as string,
            city: eventData.venueCity as string,
            pincode: eventData.venuePincode as string,
            state: eventData.venueState as string,
            seatLayout: eventData.seatLayout
          },
          select: {
            id: true
          }
        }
      )
      const event = await prisma.event.create({
        data: {
          title: eventData.title,
          ageLimit: eventData.ageLimit,
          description: eventData.description,
          tag: eventData.tag,
          category: eventData.category,
          startDate: new Date(eventData.startDate),
          endDate: new Date(eventData.endDate),
          duration: eventData.duration,
          venueId: venue.id,
          seatLayout: eventData.seatLayout,
        },
      });

      res.status(201).json({ event });
    } else {
      const event = await prisma.event.create({
        data: {
          title: eventData.title,
          ageLimit: eventData.ageLimit,
          description: eventData.description,
          tag: eventData.tag,
          category: eventData.category,
          startDate: new Date(eventData.startDate),
          endDate: new Date(eventData.endDate),
          duration: eventData.duration,
          venueId: eventData.venueId,
          seatLayout: eventData.seatLayout,
        },
      });

      res.status(201).json({ event });
    }


    // Fetch the created seats and cache them in a Redis Hash
    // const seats = await prisma.seat.findMany({
    //   where: { eventId: event.id },
    //   orderBy: { seatNumber: "asc" },
    // });

    // const hashKey = REDIS_KEYS.eventSeats(event.id);
    // const pipeline = redisClient.pipeline();
    // seats.forEach((seat: any) => {
    //   pipeline.hset(
    //     hashKey,
    //     String(seat.id),
    //     `${seat.seatNumber}:${seat.status}`,
    //   );
    // });
    // await pipeline.exec();


  } catch (error: any) {
    console.log(error)
    res.status(500).json({ error: error.message || "Failed to create event" });
  }
};

const createVenue = async (req: Request, res: Response) => {
  const data = req.body
  console.log(data)
  try {
    const venue = await prisma.venue.create(
      {
        data: {
          name: data.venueName as string,
          address: data.venueAddress as string,
          country: data.venueCountry as string,
          city: data.venueCity as string,
          pincode: data.venuePincode as string,
          state: data.venueState as string,
          seatLayout: data.seatLayout
        },
        select: {
          id: true
        }
      }
    )
    res.status(201).json({ venue });
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ error: error.message || "Failed to create venue" });
  }


}

// // PUT api/events/:eventId
const updateAnEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    console.log(parsed)
    return;
  }

  const event = parsed.data;
  const newId = getIntegerId(eventId);
  // const newId = +eventId;

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  // try {
  //   // We use a transaction to ensure everything updates successfully together
  //   const updatedEvent = await prisma.$transaction(async (tx: any) => {
  //     // 1. If totalSeats is being updated, we handle the seat recreation
  //     if (totalSeats !== undefined) {
  //       // Delete existing seats first
  //       await tx.seat.deleteMany({
  //         where: { eventId: newId },
  //       });
  //     }

  //     const event = await tx.event.update({
  //       where: { id: newId },
  //       data: {
  //         ...(name && { name }),
  //         ...(venue && { venue }),
  //         ...(imageUrl && { imageUrl }),
  //         ...(date && { date: new Date(date) }),
  //         ...(totalSeats !== undefined && {
  //           totalSeats,
  //           seats: {
  //             create: Array.from({ length: totalSeats }, (_, i) => ({
  //               seatNumber: `A${i + 1}`,
  //             })),
  //           },
  //         }),
  //       },
  //       include: { _count: { select: { seats: true } } },
  //     });

  //     return event;
  //   });

  //   // If totalSeats was updated, sync with Redis cache
  //   if (totalSeats !== undefined) {
  //     const hashKey = REDIS_KEYS.eventSeats(newId);
  //     await redisClient.del(hashKey);

  //     const seats = await prisma.seat.findMany({
  //       where: { eventId: newId },
  //       orderBy: { seatNumber: "asc" },
  //     });

  //     const pipeline = redisClient.pipeline();
  //     seats.forEach((seat: any) => {
  //       pipeline.hset(
  //         hashKey,
  //         String(seat.id),
  //         `${seat.seatNumber}:${seat.status}`,
  //       );
  //     });
  //     await pipeline.exec();
  //   }

  //   res.status(200).json({ event: updatedEvent });
  // } catch (error) {
  //   // Handle cases where the event ID doesn't exist
  //   res.status(404).json({ error: "Event not found or failed to update" });
  // }
};

const updateVenue = async (req: Request, res: Response) => {
  const { venue } = await req.body;
  console.log(venue)
  const newId = getIntegerId(venue.id);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid venue ID format" });
  }
  try {
    const updatedVenue = await prisma.venue.update({
      where: {
        id: newId
      },
      data: {
        name: venue.name,
        address: venue.address,
        state: venue.state,
        city: venue.city,
        pincode: venue.pincode,
        country: venue.country,
        seatLayout: venue.seatLayout
      }
    });

    res.status(200).json({ venue: updatedVenue });
  } catch (error) {
    // Handle cases where the venue ID doesn't exist
    console.log(error)
    res.status(404).json({ error: "Venue not found or failed to update" });
  }
};

// DELETE api/events/:eventId
const deleteAnEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const newId = getIntegerId(eventId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid event ID format" });
  }

  try {

    const deletedEvent = await prisma.event.delete({
      where: { id: newId },
    });

    // Delete the Redis cache for this event's seats
    // await redisClient.del(REDIS_KEYS.eventSeats(newId));

    res.status(200).json({
      message: "Event and associated details deleted successfully",
      event: deletedEvent,
    });
  } catch (error) {
    res.status(404).json({ error: "Event not found" });
  }
};

const deleteVenue = async (req: Request, res: Response) => {
  const { venueId } = req.params;
  const newId = getIntegerId(venueId);

  if (isNaN(newId)) {
    return res.status(400).json({ error: "Invalid venue ID format" });
  }

  try {

    const deletedVenue = await prisma.venue.delete({
      where: { id: newId },
    });

    res.status(200).json({
      message: "Venue and associated seats deleted successfully",
      venue: deletedVenue,
    });
  } catch (error) {
    res.status(404).json({ error: "Venue not found" });
  }
}

export { listAllEvents, listAllVenues, getEvent, createAnEvent, updateAnEvent, deleteAnEvent, updateVenue, getVenue, createVenue, deleteVenue }
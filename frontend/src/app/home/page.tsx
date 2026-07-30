"use client";

import Nav from "@/components/Nav";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { eventType } from "@/lib/types";
import Link from "next/link";
import * as motion from "motion/react-client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Footer from "@/components/Footer";

const Home = () => {
  const [events, setEvents] = useState<eventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/api/events");
        setEvents(res.data.events);
      } catch (err) {
        setError("Failed to load events");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="bg-gray-800 min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mb-10 rounded-[2rem] border border-border bg-card/70 p-8 shadow-sm shadow-zinc-900/5 backdrop-blur-sm"
        >
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Featured Events
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Discover and book your next unforgettable experience
            </p>
          </div>
        </motion.div>

        {loading ? (
          <p className="text-muted-foreground">Loading events...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground">No events available</p>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {events.map((event, index) => {
                const date = new Date(event.date);
                const soldOut = event.availableSeats === 0;
                const lowStock =
                  event.availableSeats > 0 &&
                  event.availableSeats <= event.totalSeats * 0.1;

                return (
                  <CarouselItem key={event.id} className="pl-0 basis-full">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: index === 0 ? 0.1 : 0,
                      }}
                      className="mb-4"
                    >
                      <Link href={`/events/${event.id}`}>
                        <motion.div
                          className="relative h-112 w-full bg-cover bg-center rounded-2xl overflow-hidden border border-border shadow-2xl"
                          style={{
                            backgroundImage: `url(${event.imageUrl})`,
                          }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/40 to-black/80"></div>

                          <div className="relative h-full flex flex-col justify-between p-8">
                            <div>
                              <p className="text-white/80 text-sm font-medium mb-2">
                                🌟 FEATURED EVENT
                              </p>
                              <h2 className="text-5xl font-bold text-white mb-3">
                                {event.name}
                              </h2>
                              <p className="text-2xl text-white/90">
                                {event.venue}
                              </p>
                            </div>

                            <div className="flex items-end justify-between">
                              <div className="text-white">
                                <p className="text-sm text-white/80 mb-1">
                                  📅 Event Date
                                </p>
                                <p className="text-lg font-semibold">
                                  {date.toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>

                              <div className="text-right text-white">
                                <p className="text-sm text-white/80 mb-1">
                                  🎫 Availability
                                </p>
                                <p className="text-3xl font-bold">
                                  {event.availableSeats} / {event.totalSeats}
                                </p>
                                <p className="text-xs text-white/70 mt-1">
                                  seats available
                                </p>
                              </div>
                            </div>

                            <div className="absolute top-6 right-6">
                              {soldOut ? (
                                <span className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold text-white">
                                  Sold Out
                                </span>
                              ) : lowStock ? (
                                <span className="rounded-full bg-yellow-500/90 px-4 py-2 text-sm font-semibold text-white">
                                  Few seats left
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            <CarouselPrevious className="absolute -left-4 sm:-left-12 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground border-0" />
            <CarouselNext className="absolute -right-4 sm:-right-12 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground border-0" />
          </Carousel>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;

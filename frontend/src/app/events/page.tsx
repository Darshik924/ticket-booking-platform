"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { eventType } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Nav";
import EventCard from "@/components/EventCard";

const Event = () => {
  const { loading: authLoading } = useAuth();
  const [events, setEvents] = useState<eventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const fetchEvents = async () => {
      try {
        const res = await api.get("/api/events");
        setEvents(res.data.events);
      } catch (err) {
        setError("Failed to load events");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [authLoading]);

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/70 p-8 shadow-sm shadow-zinc-900/5 backdrop-blur-sm">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Upcoming Events
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Pick an event and grab your seat
            </p>
          </div>
        </div>

        {loading && <p className="text-muted-foreground">Loading events...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && events.length === 0 && (
          <p className="text-muted-foreground">
            No events available right now.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Event;

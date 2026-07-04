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
    <div>
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Upcoming Events
        </h1>
        <p className="text-gray-500 mb-8">Pick an event and grab your seat</p>

        {loading && <p className="text-gray-500">Loading events...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && events.length === 0 && (
          <p className="text-gray-500">No events available right now.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Event;

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { eventType } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Nav";
import EventCard from "@/components/EventCard";
import Searchbar from "@/components/Searchbar";
import Footer from "@/components/Footer";

const EventContent = () => {
  const { loading: authLoading } = useAuth();
  const [events, setEvents] = useState<eventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";

  useEffect(() => {
    if (authLoading) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/events?query=${encodeURIComponent(query)}`);
        setEvents(res.data.events);
      } catch (err) {
        setError("Failed to load events");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [authLoading, query]);

  return (
    <div className="min-h-screen bg-gray-800 ">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/80 p-8 shadow-sm shadow-zinc-900/5 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                Upcoming Events
              </h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                Pick an event and grab your seat
              </p>
            </div>
            <div className="w-full md:max-w-md">
              <Searchbar placeholder="Search events by name or venue..." />
            </div>
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

      <Footer />
    </div>
  );
};

export default function Event() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-800 text-muted-foreground flex items-center justify-center">
        Loading...
      </div>
    }>
      <EventContent />
    </Suspense>
  );
}

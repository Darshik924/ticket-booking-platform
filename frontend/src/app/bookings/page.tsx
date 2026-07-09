"use client";

import { useEffect, useState } from "react";
import { fetchMyBookings, cancelMyBooking } from "@/lib/api";
import { bookingType } from "@/lib/types";
import Navbar from "@/components/Nav";
import BookingEventCard from "@/components/BookingEventCard";
import { BookImage } from "lucide-react";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<bookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "CONFIRMED" | "PENDING" | "CANCELLED"
  >("all");

  useEffect(() => {
    fetchMyBookings()
      .then((data) => setBookings(data.bookings))
      .catch(() => setError("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await cancelMyBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b)),
      );
    } catch {
      alert("Failed to cancel booking");
    }
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="bg-gray-800 min-h-screen">
      <Navbar />
      <main className="mx-auto px-6 py-10">
        <div className="mb-10 rounded-[2rem] border border-border bg-card/70 p-8 shadow-sm shadow-zinc-900/5 backdrop-blur-sm">
          <div className="max-w-3xl mb-6">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              All your ticket reservations
            </p>
          </div>

          <div className="flex gap-2">
            {(["all", "CONFIRMED", "CANCELLED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-muted-foreground">Loading bookings...</p>
        )}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="mb-3 text-4xl">🎟️</p>
            <p className="font-medium text-foreground">No bookings found</p>
            <p className="mt-1 text-sm">Book an event to see it here</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {filtered.map((booking) => (
            <BookingEventCard
              booking={booking}
              handleCancel={handleCancel}
              key={booking.id}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

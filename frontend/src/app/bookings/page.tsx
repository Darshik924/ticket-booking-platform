"use client";

import { useEffect, useState } from "react";
import { fetchMyBookings, cancelMyBooking } from "@/lib/api";
import { bookingType } from "@/lib/types";
import Navbar from "@/components/Nav";

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
    <div className="bg-gray-200">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">My Bookings</h1>
        <p className="mb-6 text-muted-foreground">
          All your ticket reservations
        </p>

        <div className="mb-6 flex gap-2">
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

        <div className="flex flex-col gap-4">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  {/* 1. Event Name Header */}
                  <h2 className="mb-1 text-xl font-bold text-foreground">
                    {booking.seat?.event?.name || "Untitled Event"}
                  </h2>

                  {/* Booking ID */}
                  <p className="mb-3 text-xs text-muted-foreground">
                    Booking #{booking.id}
                  </p>

                  {/* 2. Seat Details */}
                  <p className="mt-1 text-sm text-muted-foreground">
                    🎫 Seat:{" "}
                    <span className="font-semibold text-foreground">
                      {booking.seat?.seatNumber}
                    </span>
                  </p>

                  {/* 3. Event Execution Date (The day the party happens) */}
                  <p className="text-sm font-medium text-muted-foreground">
                    📅 Event Date:{" "}
                    {booking.seat?.event?.date
                      ? new Date(booking.seat.event.date).toLocaleDateString()
                      : "N/A"}
                  </p>

                  {/* 4. Ticket Booking Date (The day they bought it) */}
                  <p className="mt-1 text-xs text-muted-foreground">
                    🗓️ Booked on:{" "}
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                  <a
                    href={`/events/${booking.seat.eventId}`}
                    className="mt-1 inline-block text-sm text-primary hover:underline"
                  >
                    View Event →
                  </a>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      booking.status === "CONFIRMED"
                        ? "bg-secondary text-secondary-foreground"
                        : booking.status === "PENDING"
                          ? "bg-accent text-accent-foreground"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {booking.status.charAt(0) +
                      booking.status.slice(1).toLowerCase()}
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      booking.paymentStatus === "PAID"
                        ? "bg-primary/10 text-primary"
                        : booking.paymentStatus === "PENDING"
                          ? "bg-accent/20 text-accent-foreground"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    💳{" "}
                    {booking.paymentStatus.charAt(0) +
                      booking.paymentStatus.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              <hr className="my-3 border-border" />

              <div className="flex justify-end">
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={booking.status === "CANCELLED"}
                  className="rounded-lg cursor-pointer border border-destructive/20 px-4 py-2 text-sm text-destructive transition hover:bg-red-500 hover:text-white duration-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

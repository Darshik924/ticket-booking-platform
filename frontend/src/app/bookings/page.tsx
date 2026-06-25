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
    <div>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-500 mb-6">All your ticket reservations</p>

        <div className="flex gap-2 mb-6">
          {(["all", "CONFIRMED", "CANCELLED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                filter === f
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500">Loading bookings...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🎟️</p>
            <p className="font-medium text-gray-600">No bookings found</p>
            <p className="text-sm mt-1">Book an event to see it here</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  {/* 1. Event Name Header */}
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {booking.seat?.event?.name || "Untitled Event"}
                  </h2>

                  {/* Booking ID */}
                  <p className="text-xs text-gray-400 mb-3">
                    Booking #{booking.id}
                  </p>

                  {/* 2. Seat Details */}
                  <p className="text-sm text-gray-500 mt-1">
                    🎫 Seat:{" "}
                    <span className="font-semibold text-gray-700">
                      {booking.seat?.seatNumber}
                    </span>
                  </p>

                  {/* 3. Event Execution Date (The day the party happens) */}
                  <p className="text-sm text-gray-600 font-medium">
                    📅 Event Date:{" "}
                    {booking.seat?.event?.date
                      ? new Date(booking.seat.event.date).toLocaleDateString()
                      : "N/A"}
                  </p>

                  {/* 4. Ticket Booking Date (The day they bought it) */}
                  <p className="text-xs text-gray-400 mt-1">
                    🗓️ Booked on:{" "}
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                  <a
                    href={`/events/${booking.seat.eventId}`}
                    className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                  >
                    View Event →
                  </a>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      booking.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : booking.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-600"
                    }`}
                  >
                    {booking.status.charAt(0) +
                      booking.status.slice(1).toLowerCase()}
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      booking.paymentStatus === "PAID"
                        ? "bg-blue-100 text-blue-700"
                        : booking.paymentStatus === "PENDING"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-red-100 text-red-500"
                    }`}
                  >
                    💳{" "}
                    {booking.paymentStatus.charAt(0) +
                      booking.paymentStatus.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              <hr className="my-3 border-gray-100" />

              <div className="flex justify-end">
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={booking.status === "CANCELLED"}
                  className="text-sm border border-red-200 text-red-500 rounded-lg px-4 py-2 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

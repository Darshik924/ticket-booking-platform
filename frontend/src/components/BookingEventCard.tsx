import { bookingType } from "@/lib/types";
import React from "react";
import * as motion from "motion/react-client";

interface bookingEventProps {
  booking: bookingType;
  handleCancel: (id: number) => Promise<void>;
}

const BookingEventCard: React.FC<bookingEventProps> = ({
  booking,
  handleCancel,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      key={booking.id}
      className="rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image Section with Overlay */}
      <div
        className="relative h-56 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${booking.imageUrl})` }}
      >
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/40 to-black/70"></div>

        {/* Content Overlay */}
        <div className="relative h-full flex flex-col justify-between p-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {booking.seat?.event?.name || "Untitled Event"}
            </h2>
            <p className="text-sm text-white/80">Booking #{booking.id}</p>
          </div>

          {/* Status Badges */}
          <div className="flex gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                booking.status === "CONFIRMED"
                  ? "bg-green-500/90 text-white"
                  : booking.status === "PENDING"
                    ? "bg-yellow-500/90 text-white"
                    : "bg-red-500/90 text-white"
              }`}
            >
              {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
            </span>

            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                booking.paymentStatus === "PAID"
                  ? "bg-blue-500/90 text-white"
                  : booking.paymentStatus === "PENDING"
                    ? "bg-orange-500/90 text-white"
                    : "bg-red-500/90 text-white"
              }`}
            >
              💳{" "}
              {booking.paymentStatus.charAt(0) +
                booking.paymentStatus.slice(1).toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="bg-gray-500 p-4">
        <div className="space-y-2 mb-4">
          {/* Seat Details */}
          <p className="text-md text-gray-100">
            🎫 Seat:{" "}
            <span className="font-semibold">{booking.seat?.seatNumber}</span>
          </p>

          {/* Event Date */}
          <p className="text-md text-gray-100">
            📅 Event:{" "}
            {booking.seat?.event?.date
              ? new Date(booking.seat.event.date).toLocaleDateString()
              : "N/A"}
          </p>

          {/* Booking Date */}
          <p className="text-sm text-gray-100">
            🗓️ Booked: {new Date(booking.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-4">
            {/* Your Link */}
            <a
              href={`/events/${booking.seat.eventId}`}
              className="flex-1 p-2 text-center text-md text-blue-400 hover:bg-blue-700 hover:text-white duration-200 rounded-xl items-center font-medium"
            >
              View Event →
            </a>
          </div>

          <button
            onClick={() => handleCancel(booking.id)}
            disabled={booking.status === "CANCELLED"}
            className="flex-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-red-300 transition hover:bg-red-600 hover:text-white duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BookingEventCard;

"use client";

import { eventType } from "@/lib/types";
import * as motion from "motion/react-client";

interface AdminEventCardProps {
  event: eventType;
  onEdit: (event: eventType) => void;
  onDelete: (eventId: number) => void;
  isDeleting?: boolean;
}

const AdminEventCard = ({
  event,
  onEdit,
  onDelete,
  isDeleting = false,
}: AdminEventCardProps) => {
  const date = new Date(event.date);
  const soldOut = event.availableSeats === 0;
  const lowStock =
    event.availableSeats > 0 && event.availableSeats <= event.totalSeats * 0.15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{ y: -8 }}
      className="rounded-2xl border border-border overflow-hidden shadow-sm transition-shadow hover:shadow-lg"
    >
      {/* Image Section with Overlay */}
      <motion.div
        className="relative h-52 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${event.imageUrl})` }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/40 to-black/70"></div>

        {/* Content Overlay */}
        <div className="relative h-full flex flex-col justify-between p-5">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{event.name}</h3>
            <p className="text-sm text-white/90">{event.venue}</p>
            <p className="mt-2 text-xs text-white/80">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex gap-2 items-center">
            {soldOut ? (
              <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white">
                Sold Out
              </span>
            ) : lowStock ? (
              <span className="rounded-full bg-yellow-500/90 px-3 py-1 text-xs font-semibold text-white">
                Low Stock
              </span>
            ) : (
              <span className="rounded-full bg-green-500/90 px-3 py-1 text-xs font-semibold text-white">
                Active
              </span>
            )}
            <span className="text-xs text-white/70 ml-auto">
              ID #{event.id}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Card Body */}
      <div className="bg-gray-300 p-5">
        {/* Seats Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="rounded-xl bg-muted p-4 cursor-default"
          >
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Total Seats
            </p>
            <p className="text-2xl font-bold text-foreground">
              {event.totalSeats}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="rounded-xl bg-muted p-4 cursor-default"
          >
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Available
            </p>
            <p className="text-2xl font-bold text-green-600">
              {event.availableSeats}
            </p>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            type="button"
            onClick={() => onEdit(event)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground duration-300 cursor-pointer"
          >
            ✏️ Edit
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onDelete(event.id)}
            disabled={isDeleting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-red-600 hover:text-white hover:border-red-600 duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-destructive/10"
          >
            {isDeleting ? "🗑️ Deleting..." : "🗑️ Delete"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminEventCard;

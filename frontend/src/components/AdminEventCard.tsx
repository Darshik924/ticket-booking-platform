"use client";

import { eventType } from "@/lib/types";

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
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
          <p className="text-sm text-gray-500">{event.venue}</p>
          <p className="mt-2 text-sm text-gray-600">
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

        <div className="flex flex-col items-end gap-2 text-right">
          <span className="text-sm text-gray-500">ID #{event.id}</span>
          {soldOut ? (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              Sold out
            </span>
          ) : lowStock ? (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              Low stock
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-gray-600">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-medium text-slate-900">Total seats</p>
          <p>{event.totalSeats}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-medium text-slate-900">Available seats</p>
          <p>{event.availableSeats}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onEdit(event)}
          className="rounded-2xl border border-black bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          disabled={isDeleting}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default AdminEventCard;

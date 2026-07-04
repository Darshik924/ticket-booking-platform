"use client";

import { useMemo } from "react";
import { eventType } from "@/lib/types";

interface AdminEventFormProps {
  event?: Partial<eventType>;
  onChange: (field: string, value: string | number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const AdminEventForm = ({
  event,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AdminEventFormProps) => {
  const eventDate = useMemo(() => {
    // useMemo() hook caches or memoizes the result of an expensive calculation re render 
    if (!event?.date) return "";
    return new Date(event.date).toISOString().slice(0, 16);
  }, [event?.date]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {event ? "Edit event" : "Create new event"}
          </h2>
          <p className="text-sm text-gray-500">
            Update event details or add a brand new show.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-gray-700">
          <span>Name</span>
          <input
            value={event?.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Event name"
            className="w-full rounded-2xl border border-gray-300 bg-slate-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>

        <label className="space-y-2 text-sm text-gray-700">
          <span>Venue</span>
          <input
            value={event?.venue || ""}
            onChange={(e) => onChange("venue", e.target.value)}
            placeholder="Venue name"
            className="w-full rounded-2xl border border-gray-300 bg-slate-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>

        <label className="space-y-2 text-sm text-gray-700">
          <span>Date & time</span>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => onChange("date", e.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-slate-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>

        <label className="space-y-2 text-sm text-gray-700">
          <span>Total seats</span>
          <input
            type="number"
            min={1}
            value={event?.totalSeats || ""}
            onChange={(e) => onChange("totalSeats", Number(e.target.value))}
            placeholder="100"
            className="w-full rounded-2xl border border-gray-300 bg-slate-50 px-4 py-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
};

export default AdminEventForm;

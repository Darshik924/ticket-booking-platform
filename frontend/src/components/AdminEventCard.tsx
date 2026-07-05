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
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {event.name}
          </h3>
          <p className="text-sm text-muted-foreground">{event.venue}</p>
          <p className="mt-2 text-sm text-muted-foreground">
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
          <span className="text-sm text-muted-foreground">ID #{event.id}</span>
          {soldOut ? (
            <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              Sold out
            </span>
          ) : lowStock ? (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              Low stock
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="rounded-2xl bg-muted p-4">
          <p className="font-medium text-foreground">Total seats</p>
          <p>{event.totalSeats}</p>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <p className="font-medium text-foreground">Available seats</p>
          <p>{event.availableSeats}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onEdit(event)}
          className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground hover:text-background"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          disabled={isDeleting}
          className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default AdminEventCard;

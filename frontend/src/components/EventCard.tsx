import Link from "next/link";
import { eventType } from "@/lib/types";

const EventCard = ({ event }: { event: eventType }) => {
  const date = new Date(event.date);

  const soldOut = event.availableSeats === 0;
  const lowStock =
    event.availableSeats > 0 && event.availableSeats <= event.totalSeats * 0.1;

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-zinc-900">{event.name}</h3>
        {soldOut && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Sold Out
          </span>
        )}
        {!soldOut && lowStock && (
          <span className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            Few seats left
          </span>
        )}
      </div>

      <p className="mb-1 text-sm text-muted-foreground">{event.venue}</p>
      <p className="mb-6 text-sm text-muted-foreground">
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {event.availableSeats} / {event.totalSeats} seats available
        </span>
        <span className="font-semibold text-primary transition hover:text-primary/80">
          View →
        </span>
      </div>
    </Link>
  );
};

export default EventCard;

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
      className="block bg-gray-50 rounded-xl border-2 border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{event.name}</h3>
        {soldOut && (
          <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
            Sold Out
          </span>
        )}
        {!soldOut && lowStock && (
          <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            Few seats left
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-1">{event.venue}</p>
      <p className="text-sm text-gray-500 mb-4">
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          {event.availableSeats} / {event.totalSeats} seats available
        </span>
        <span className="text-black font-medium">View →</span>
      </div>
    </Link>
  );
};

export default EventCard;

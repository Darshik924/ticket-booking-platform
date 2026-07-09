import Link from "next/link";
import { eventType } from "@/lib/types";
import * as motion from "motion/react-client";

const EventCard = ({ event }: { event: eventType }) => {
  const date = new Date(event.date);
  const imageUrl = event.imageUrl;
  const soldOut = event.availableSeats === 0;
  const lowStock =
    event.availableSeats > 0 && event.availableSeats <= event.totalSeats * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      className="block rounded-xl border border-border/60 overflow-hidden shadow-sm transition-shadow hover:shadow-md"
    >
      <Link href={`/events/${event.id}`}>
        <motion.div
          className="relative h-48 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
          whileHover={{ scale: 1.05 }} // Image zooms slightly on hover
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/30 to-black/60"></div>

          <div className="relative h-full flex flex-col justify-between p-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {event.name}
              </h3>
              <p className="text-md text-white/90">{event.venue}</p>
            </div>

            <div className="flex gap-2">
              {soldOut && (
                <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white">
                  Sold Out
                </span>
              )}
              {!soldOut && lowStock && (
                <span className="rounded-full bg-yellow-500/90 px-3 py-1 text-xs font-semibold text-white">
                  Few seats left
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card Body */}
        <div className="bg-gray-500 p-4">
          <p className="mb-2 text-md font-semibold font-sans text-white">
            📅{" "}
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <div className="flex items-center justify-between text-md">
            <span className="text-md text-white">
              🎫 {event.availableSeats} / {event.totalSeats} seats
            </span>
            <span className="font-semibold text-cyan-200  transition hover:text-blue-800 hover:bg-blue-100 duration-300 p-2 rounded-xl">
              View →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;

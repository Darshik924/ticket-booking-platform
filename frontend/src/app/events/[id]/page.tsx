"use client"; // Runs in browser (needed for hooks like useEffect/useState)

import { useEffect, useState, use, useCallback } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { eventType, seatType } from "@/lib/types";
import Navbar from "@/components/Nav";
import SeatLockInfo from "@/components/queue/SeatLockInfo";
import PaymentQueuePanel from "@/components/queue/PaymentQueuePanel";
import MapQueuePanel from "@/components/queue/MapQueuePanel";
import { socket } from "@/lib/socket"; //our socket manager
import { redirect, useRouter } from "next/navigation";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EventDetails = ({ params }: PageProps) => {
  const { id } = use(params); // Grabs the event ID from the URL path (e.g., /events/2)

  const handleTimeOut = () => {
    redirect(`/events`);
  };

  const router = useRouter();
  // --- APP STATES ---
  const [event, setEvent] = useState<eventType | null>(null);
  const [seats, setSeats] = useState<seatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<seatType | null>(null); // Tracks clicked seat
  const [reservedSeat, setReservedSeat] = useState<seatType | null>(null);
  const [lockExpiresIn, setLockExpiresIn] = useState<number | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queueState, setQueueState] = useState({
    status: "idle" as "idle" | "waiting" | "processing" | "success" | "failed",
    message: "",
  });
  const [isLocking, setIsLocking] = useState(false); // Prevents spamming button clicks

  // --- SEAT MAP WAITING QUEUE STATE ---
  const [mapQueueState, setMapQueueState] = useState<{
    isWaiting: boolean;
    position: number | null;
    message: string;
    connectionType: "websocket" | "polling" | "none";
  }>({
    isWaiting: false,
    position: null,
    message: "",
    connectionType: "none",
  });

  // --- FETCH SEATS MAP ---
  const fetchSeats = useCallback(async () => {
    try {
      const response = await api.get(`/api/events/${id}/seats`);
      if (response.data.status === "WAITING") {
        setMapQueueState((prev) => ({
          ...prev,
          isWaiting: true,
          position: response.data.queuePosition,
          message: response.data.message || "You are in the waiting queue.",
        }));
      } else {
        setMapQueueState((prev) => ({
          ...prev,
          isWaiting: false,
          position: null,
          message: "",
        }));
        setSeats(response.data.seats || []);
      }
    } catch (err) {
      console.error("Failed to load seats map:", err);
      setError("Failed to load seats map.");
    }
  }, [id]);

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const eventResponse = await api.get(`/api/events/${id}`);
        setEvent(eventResponse.data.event);
        await fetchSeats();
      } catch (err) {
        setError("Failed to load event details.");
      } finally {
        setLoading(false); // Shuts off loading state
      }
    };

    fetchPageData();

    const token = localStorage.getItem("token");
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      setMapQueueState((prev) => ({
        ...prev,
        connectionType: "polling",
      }));
    }

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("join_event_queue", id);
      socket.emit("join_seat_map", id);
      setMapQueueState((prev) => ({
        ...prev,
        connectionType: "websocket",
      }));
    });

    socket.on(
      "seat_status_changed",
      (payload: { seatId: number; status: string }) => {
        setSeats((prevSeats) =>
          prevSeats.map((s) =>
            s.id === payload.seatId
              ? { ...s, status: payload.status as seatType["status"] }
              : s,
          ),
        );
      },
    );

    socket.on("connect_error", (error: any) => {
      console.error("Socket connect error:", error);
      setQueueState((current) => ({
        ...current,
        status: "failed",
        message:
          "Socket connection failed. Real-time queue updates may not be available.",
      }));
      setMapQueueState((prev) => ({
        ...prev,
        connectionType: "polling",
      }));
    });

    socket.on("disconnect", (reason: any) => {
      console.log("Socket disconnected:", reason);
    });

    // Listen for the success shout from paymentWorker.TS
    socket.on("booking_confirmed", (payload: any) => {
      setQueueState((current) => ({
        ...current,
        status: "success",
        message: payload.message || "Booking confirmed.",
      }));
    });

    // Listen for the event when our worker is processing it at that time
    socket.on("payment_processing", (payload: any) => {
      setQueueState((current) => ({
        ...current,
        status: "processing",
        message: payload.message || "Your payment is being processed...",
      }));
    });

    //listen for the FAILURE SHOUT
    socket.on("booking_failed", (payload: any) => {
      console.error("WebSocket Failure Receive :", payload);
      setQueueState((current) => ({
        ...current,
        status: "failed",
        message:
          payload.message ||
          "Booking failed. Your seat lock may have been released.",
      }));
    });

    // Listen for the real time queue updates from queue.service.ts and update our mapQueueState
    socket.on("queue_update", (payload: any) => {
      setMapQueueState((prev) => ({
        ...prev,
        position: payload.queuePosition ?? prev.position,
        message: payload.message ?? prev.message,
      }));
    });

    socket.on("queue_promoted", (payload: any) => {
      setMapQueueState((prev) => ({
        ...prev,
        isWaiting: false,
        position: null,
        message: payload.message || "",
      }));
      fetchSeats();
    });

    socket.on("queue_moved", (payload: any) => {
      console.log("Queue moved received:", payload);
    });

    //cleanUp channnel on leave :always turn off walkie-talkies when leaving the page
    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("booking_confirmed");
      socket.off("booking_failed");
      socket.off("queue_update");
      socket.off("queue_promoted");
      socket.off("queue_moved");
      socket.off("payment_processing");
      socket.off("seat_status_changed");
      socket.disconnect();
    };
  }, [id, fetchSeats]);

  // Polling fallback when user is waiting in seat map queue
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (mapQueueState.isWaiting) {
      // Set connection type to polling if it's still 'none' after 2 seconds
      const timeoutId = setTimeout(() => {
        setMapQueueState((prev) => {
          if (prev.connectionType === "none") {
            return { ...prev, connectionType: "polling" };
          }
          return prev;
        });
      }, 2000);

      intervalId = setInterval(async () => {
        try {
          const response = await api.get(`/api/events/${id}/seats`);
          if (response.data.status === "ACTIVE") {
            setMapQueueState((prev) => ({
              ...prev,
              isWaiting: false,
              position: null,
              message: "",
            }));
            setSeats(response.data.seats || []);
          } else if (response.data.status === "WAITING") {
            setMapQueueState((prev) => ({
              ...prev,
              position: response.data.queuePosition,
              message: response.data.message || prev.message,
            }));
          }
        } catch (err) {
          console.error("Polling seat map failed:", err);
        }
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }
  }, [mapQueueState.isWaiting, id]);

  // --- REDIS LOCK API CALL ---
  // --- FULL UPDATED FLOW: REDIS LOCK + BULLMQ CHECKOUT QUEUE ---
  const handleReserveSeat = async () => {
    if (!selectedSeat) return;

    try {
      setIsLocking(true);

      const response = await api.post(
        `/api/seats/${id}/${selectedSeat.id}/lock`,
      );
      const expiresIn = response.data.lockExpiresIn ?? 300;

      setSeats((previousSeats) =>
        previousSeats.map((s) =>
          s.id === selectedSeat.id ? { ...s, status: "LOCKED" } : s,
        ),
      );

      setReservedSeat(selectedSeat);
      setSelectedSeat(null);
      setLockExpiresIn(expiresIn);
      setShowQueue(false);
      setQueueState({
        status: "idle",
        message: "Reserve your seat and then click Pay Now.",
      });
    } catch (err: any) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          "Reservation failed. Please select a different seat.",
      );
    } finally {
      setIsLocking(false);
    }
  };

  const handlePayNow = async () => {
    if (!reservedSeat) return;

    try {
      setShowQueue(true);
      setQueueState({
        status: "waiting",
        message: "You are in the payment queue. Waiting for updates...",
      });

      // Dummy values for our Queue IDK what to put here doesnt update...

      const response = await api.post("/api/payment/pay", {
        eventId: id,
        seatId: reservedSeat.id,
        imageUrl: event?.imageUrl,
      });

      console.log("Payment queue job accepted:", response.data);
      setQueueState((current) => ({
        ...current,
        status: "waiting",
        message:
          "Your payment request is accepted. Waiting for queue updates...",
      }));

      // Keep the UI waiting while the backend sends queue updates.
      // queue_update and queue_promoted events are handled via socket listeners.
    } catch (err: any) {
      console.log(err);
      setQueueState({
        status: "failed",
        message:
          err.response?.data?.message ||
          "Payment request failed. Please try again.",
      });
    }
  };

  const handleCancelReservation = async () => {
    try {
      const response = await api.delete(
        `/api/seats/${id}/${reservedSeat?.id}/lock`,
      );
      console.log(response);
    } catch (err: any) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          "Something Went Wrong, return to Home page.",
      );
    }

    setSelectedSeat(null);
    setReservedSeat(null);
    setLockExpiresIn(null);
    setShowQueue(false);
    setQueueState({ status: "idle", message: "" });

    router.push("/events");
  };

  return (
    <div className="bg-gray-800 min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading && <p className="text-muted-foreground">Loading details...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {event && (
          <div>
            <div
              className="relative h-96 w-full bg-cover bg-center rounded-2xl overflow-hidden border border-border shadow-lg mb-10"
              style={{ backgroundImage: `url(${event.imageUrl})` }}
            >
              <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/40 to-black/70"></div>

              <div className="relative h-full flex flex-col justify-between p-8">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">
                    EVENT DETAILS
                  </p>
                  <h1 className="text-5xl font-bold text-white mb-3">
                    {event.name}
                  </h1>
                  <p className="text-xl text-white/90 mb-4">{event.venue}</p>
                </div>

                <div className="flex items-end justify-between">
                  <div className="text-white">
                    <p className="text-sm text-white/80 mb-1">📅 Event Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="text-right text-white">
                    <p className="text-sm text-white/80 mb-1">
                      🎫 Availability
                    </p>
                    <p className="text-2xl font-bold">
                      {event.availableSeats} / {event.totalSeats}
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      seats available
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SEATING BOX */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Select Your Seats
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Available: {event.availableSeats} / {event.totalSeats}
              </p>

              {mapQueueState.isWaiting ? (
                <MapQueuePanel
                  queuePosition={mapQueueState.position}
                  message={mapQueueState.message}
                  connectionType={mapQueueState.connectionType}
                />
              ) : !reservedSeat && !showQueue ? (
                <>
                  {/* SEAT GRID (10 columns across) */}
                  <div className="max-h-100 grid grid-cols-10 gap-2 overflow-y-auto rounded-lg border border-border bg-muted p-4">
                    {seats.map((singleSeat: seatType) => {
                      let bgColor =
                        "border-secondary/30 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30";
                      if (singleSeat.status === "LOCKED") {
                        bgColor =
                          "cursor-not-allowed border-accent/30 bg-accent/20 text-accent-foreground";
                      } else if (singleSeat.status === "BOOKED") {
                        bgColor =
                          "cursor-not-allowed border-border bg-gray-300 text-black/30";
                      }

                      const isCurrentlySelected =
                        selectedSeat?.id === singleSeat.id;

                      return (
                        <button
                          key={singleSeat.id}
                          disabled={
                            singleSeat.status !== "AVAILABLE" || isLocking
                          }
                          className={`flex h-10 items-center justify-center rounded border text-xs font-medium transition-all ${isCurrentlySelected ? "scale-95 border-primary bg-primary text-primary-foreground ring-2 ring-primary/20" : bgColor}`}
                          onClick={() => setSelectedSeat(singleSeat)}
                        >
                          {singleSeat.seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* LEGEND */}
                  <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded border border-secondary/30 bg-secondary/20"></span>{" "}
                      Available
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded border border-accent/30 bg-accent/20"></span>{" "}
                      Locked
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded border border-border bg-muted"></span>{" "}
                      Booked
                    </div>
                  </div>

                  {/* ACTION BOTTOM BAR (Shows up only when a seat is picked) */}
                  {selectedSeat && (
                    <div className="mt-6 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-4">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          You selected seat:
                        </p>
                        <h4 className="text-xl font-bold text-primary">
                          {selectedSeat.seatNumber}
                        </h4>
                      </div>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleReserveSeat}
                        disabled={isLocking}
                        className="rounded-lg bg-primary px-5 py-2.5 text-sm cursor-pointer hover:bg-black duration-300 font-semibold text-primary-foreground shadow-sm transition disabled:bg-primary/60"
                      >
                        {isLocking ? "Reserving..." : "Reserve Seat"}
                      </motion.button>
                    </div>
                  )}
                </>
              ) : reservedSeat && !showQueue ? (
                <SeatLockInfo
                  seat={reservedSeat}
                  lockExpiresIn={lockExpiresIn}
                  onPayNow={handlePayNow}
                  onCancel={handleCancelReservation}
                  onTimeOut={handleTimeOut}
                />
              ) : reservedSeat && showQueue ? (
                <PaymentQueuePanel
                  seat={reservedSeat}
                  queueState={queueState}
                />
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDetails;

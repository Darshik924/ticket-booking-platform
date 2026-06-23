"use client"; // Runs in browser (needed for hooks like useEffect/useState)

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { eventType, seatType } from "@/lib/types";
import Navbar from "@/components/Nav";
import SeatLockInfo from "@/components/SeatLockInfo";
import PaymentQueuePanel from "@/components/PaymentQueuePanel";
import { socket } from "@/lib/socket"; //our socket manager

interface PageProps {
  params: Promise<{ id: string }>;
}

// Make a separate TTL view section, On clicking reserve seat this user only sees the TTL view section and there he sees his TTL and he should see Pay Now option.
// After clicking Pay Now he now sees payment queue component and there he gets feedback on his queue and booking processed or not

/* CHANGES */
// SeatLockInfo.tsx shows TTL countdown and shows Pay Now and Cancel Reservation
// PaymentQueuePanel.tsx - a skeleton queue panel and status, queue postion, and message area
// In page.tsx - added reserveSeat, lockExpiresIn, showQueue and queueState

// Reserve Seat Now transitions into TTL view
// Pay Now opens the payment queue panel
// Cancel returns to seat selection

const EventDetails = ({ params }: PageProps) => {
  const { id } = use(params); // Grabs the event ID from the URL path (e.g., /events/2)

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
    position: null as number | null,
  });
  const [isLocking, setIsLocking] = useState(false); // Prevents spamming button clicks

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        // Promise.all runs both API requests at the exact same time
        const [eventResponse, seatsResponse] = await Promise.all([
          api.get(`/api/events/${id}`),
          api.get(`/api/events/${id}/seats`),
        ]);

        setEvent(eventResponse.data.event);
        setSeats(seatsResponse.data.seats); // Storing the 500 seats array
      } catch (err) {
        setError("Failed to load event details.");
      } finally {
        setLoading(false); // Shuts off loading state
      }
    };

    fetchPageData();

    // turn on walkie-talkie connection
    const token = localStorage.getItem("token");
    if (token) {
      socket.auth = { token };
    }
    socket.connect();

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("join_event_queue", id);
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket connect error:", error);
      setQueueState((current) => ({
        ...current,
        status: "failed",
        message: "Socket connection failed. Real-time queue updates may not be available.",
        position: current.position,
      }));
    });

    socket.on("disconnect", (reason: any) => {
      console.log("Socket disconnected:", reason);
    });

    // Listen for the success shout from paymentWorker.TS
    socket.on("booking_confirmed", (payload: any) => {
      console.log("WebSocket Confirmed Receive:", payload);
      setQueueState((current) => ({
        ...current,
        status: "success",
        message: payload.message || "Booking confirmed.",
        position: null,
      }));
      alert(`🎉 Success! ${payload.message}`);
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
        position: null,
      }));
      alert(`❌ Oh no! ${payload.message}`);
    });

    // Listen for the real time queue updates from queueService.ts and update our queueState and then pass it directly to our universal component
    socket.on("queue_update", (payload: any) => {
      console.log("Queue update received:", payload);
      setQueueState((current) => ({
        ...current,
        status: payload.status?.toLowerCase() ?? "waiting",
        message: payload.message ?? current.message,
        position: payload.queuePosition ?? current.position,
      }));
    });

    socket.on("queue_promoted", (payload: any) => {
      console.log("Queue promoted received:", payload);
      setQueueState((current) => ({
        ...current,
        status: "processing",
        message:
          payload.message ?? "Your payment queue request is now processing.",
        position: payload.queuePosition ?? current.position,
      }));
    });

    socket.on("queue_moved", (payload: any) => {
      console.log("Queue moved received:", payload);
      setQueueState((current) => ({
        ...current,
        message: payload.message ?? current.message,
      }));
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
      socket.disconnect();
    };
  }, [id]);

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
        position: null,
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
        position: -1,
      });

      // Dummy values for our Queue IDK what to put here doesnt update...

      const response = await api.post("/api/payment/pay", {
        eventId: id,
        seatId: reservedSeat.id,
      });

      console.log("Payment queue job accepted:", response.data);
      setQueueState((current) => ({
        ...current,
        status: "waiting",
        message:
          "Your payment request is accepted. Waiting for queue updates...",
        position: response.data.queuePosition ?? current.position,
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
        position: null,
      });
    }
  };

  const handleCancelReservation = () => {
    if (reservedSeat) {
      setSeats((previousSeats) =>
        previousSeats.map((s) =>
          s.id === reservedSeat.id ? { ...s, status: "AVAILABLE" } : s,
        ),
      );
    }
    setSelectedSeat(null);
    setReservedSeat(null);
    setLockExpiresIn(null);
    setShowQueue(false);
    setQueueState({ status: "idle", message: "", position: null });
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        {loading && <p className="text-gray-500">Loading details...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {event && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {event.name}
            </h1>
            <p className="text-gray-600 mb-1">📍 {event.venue}</p>
            <p className="text-gray-600 mb-6">
              📅 {new Date(event.date).toLocaleDateString()}
            </p>

            {/* SEATING BOX */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">Select Your Seats</h3>
              <p className="text-sm text-gray-500 mb-6">
                Available: {event.availableSeats} / {event.totalSeats}
              </p>

              {!reservedSeat && !showQueue ? (
                <>
                  {/* SEAT GRID (10 columns across) */}
                  <div className="grid grid-cols-10 gap-2 max-h-100 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-100">
                    {seats.map((singleSeat: seatType) => {
                      let bgColor =
                        "bg-green-100 hover:bg-green-200 text-green-700 border-green-300";
                      if (singleSeat.status === "LOCKED") {
                        bgColor =
                          "bg-amber-100 text-amber-700 border-amber-300 cursor-not-allowed";
                      } else if (singleSeat.status === "BOOKED") {
                        bgColor =
                          "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed";
                      }

                      const isCurrentlySelected =
                        selectedSeat?.id === singleSeat.id;

                      return (
                        <button
                          key={singleSeat.id}
                          disabled={
                            singleSeat.status !== "AVAILABLE" || isLocking
                          }
                          className={`flex items-center justify-center h-10 rounded text-xs font-medium border transition-all ${isCurrentlySelected ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 scale-95" : bgColor}`}
                          onClick={() => setSelectedSeat(singleSeat)}
                        >
                          {singleSeat.seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* LEGEND */}
                  <div className="flex gap-4 mt-4 text-xs text-gray-600 justify-center">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-100 border border-green-300 rounded inline-block"></span>{" "}
                      Available
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded inline-block"></span>{" "}
                      Locked
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded inline-block"></span>{" "}
                      Booked
                    </div>
                  </div>

                  {/* ACTION BOTTOM BAR (Shows up only when a seat is picked) */}
                  {selectedSeat && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-800 font-medium">
                          You selected seat:
                        </p>
                        <h4 className="text-xl font-bold text-blue-900">
                          {selectedSeat.seatNumber}
                        </h4>
                      </div>
                      <button
                        onClick={handleReserveSeat}
                        disabled={isLocking}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition"
                      >
                        {isLocking ? "Reserving..." : "Reserve Seat"}
                      </button>
                    </div>
                  )}
                </>
              ) : reservedSeat && !showQueue ? (
                <SeatLockInfo
                  seat={reservedSeat}
                  lockExpiresIn={lockExpiresIn}
                  onPayNow={handlePayNow}
                  onCancel={handleCancelReservation}
                />
              ) : reservedSeat && showQueue ? (
                <PaymentQueuePanel
                  seat={reservedSeat}
                  queueState={queueState}
                  onCancel={handleCancelReservation}
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

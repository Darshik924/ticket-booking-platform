"use client"; // Runs in browser (needed for hooks like useEffect/useState)

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { eventType, seatType } from "@/lib/types";
import Navbar from "@/components/Nav";
import { socket } from "@/lib/socket";//our socket manager

interface PageProps {
  params: Promise<{ id: string }>; 
}

const EventDetails = ({ params }: PageProps) => {
  const { id } = use(params); // Grabs the event ID from the URL path (e.g., /events/2)

  // --- APP STATES ---
  const [event, setEvent] = useState<eventType | null>(null);
  const [seat, setSeats] = useState<seatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<seatType | null>(null); // Tracks clicked seat
  const [isLocking, setIsLocking] = useState(false); // Prevents spamming button clicks

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        // Promise.all runs both API requests at the exact same time
        const [eventResponse, seatsResponse] = await Promise.all([
          api.get(`/api/events/${id}`),        
          api.get(`/api/events/${id}/seats`)  
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
    socket.connect();

    //Authenticate with the socket server
    //(Your backend socket setup usually listens for this "join" or "auth" event)
    const token = localStorage.getItem("token");
    if(token){
        socket.emit("authenticate", {token});
    }

    //listen for the success shout from paymentWorker.TS
    socket.on("booking_confirmed",(payload:any)=>{
        console.log("WebSocket Confirmed Receive:", payload);
        alert(`🎉 Success! ${payload.message}`);
    });

    //listen for the FAILURE SHOUT
    socket.on("booking_failed",(payload:any)=>{
        console.error("WebSocket Failure Receive :", payload);
        alert(`❌ Oh no! ${payload.message}`);
    });

    //cleanUp channnel on leave :always turn off walkie-talkies when leaving the page
    return()=>{
        socket.off("booking_confirmed");
        socket.off("booking_failed");
        socket.disconnect();
    };
    

  }, [id]);

  // --- REDIS LOCK API CALL ---
    // --- FULL UPDATED FLOW: REDIS LOCK + BULLMQ CHECKOUT QUEUE ---
  const handleLockSeat = async () => {
    if (!selectedSeat) return;
    
    try {
      setIsLocking(true); // Turns on loading/processing state
      
      // STEP 1: Secure the temporary hold in Redis (5-minute timer)
      await api.post(`/api/seats/${id}/${selectedSeat.id}/lock`);
      
      // INSTANT LIVE SYNC: Manually flip this seat's status to orange on the UI layout immediately
      setSeats((previousSeats) =>
        previousSeats.map((s) =>
          s.id === selectedSeat.id ? { ...s, status: "LOCKED" } : s
        )
      );

      // STEP 2: Drop the payment/order request into your BullMQ background queue
      const response = await api.post("/api/payment/pay", {
        eventId: id,        // Pass the event parameter ID
        seatId: selectedSeat.id, // Pass the selected seat unique ID
      });
      
      console.log("Queue accepted response:", response.data);
      alert("Seat reserved! Your payment is now being processed safely in the background...");
      
      // Clear the active selection bar because the reservation request has completed hand-off
      setSelectedSeat(null);
      
    } catch (err: any) {
      console.error(err);
      // Grabs whatever custom message error your Express handlers throw out (e.g., "Seat already booked")
      alert(err.response?.data?.message || "Booking request failed. Please select a different seat.");
    } finally {
      setIsLocking(false); // Re-enables buttons and clears loading blockers
    }
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        {loading && <p className="text-gray-500">Loading details...</p>}
        {error && <p className="text-red-600">{error}</p>}
        
        {event && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
            <p className="text-gray-600 mb-1">📍 {event.venue}</p>
            <p className="text-gray-600 mb-6">📅 {new Date(event.date).toLocaleDateString()}</p>
            
            {/* SEATING BOX */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">Select Your Seats</h3>
              <p className="text-sm text-gray-500 mb-6">
                Available: {event.availableSeats} / {event.totalSeats}
              </p>

              {/* SEAT GRID (10 columns across) */}
              <div className="grid grid-cols-10 gap-2 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-100">
                {seat.map((singleSeat: seatType) => {
                  
                  // Dynamically pick color based on backend status
                  let bgColor = "bg-green-100 hover:bg-green-200 text-green-700 border-green-300"; 
                  if (singleSeat.status === "LOCKED") {
                    bgColor = "bg-amber-100 text-amber-700 border-amber-300 cursor-not-allowed";
                  } else if (singleSeat.status === "BOOKED") {
                    bgColor = "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed";
                  }

                  // Checks if this specific seat is the one currently clicked
                  const isCurrentlySelected = selectedSeat?.id === singleSeat.id;

                  return (
                    <button
                      key={singleSeat.id}
                      disabled={singleSeat.status !== "AVAILABLE" || isLocking}
                      className={`flex items-center justify-center h-10 rounded text-xs font-medium border transition-all ${
                        isCurrentlySelected 
                          ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 scale-95" // Blue fallback if selected
                          : bgColor
                      }`}
                      onClick={() => setSelectedSeat(singleSeat)} // Sets the state on click
                    >
                      {singleSeat.seatNumber}
                    </button>
                  );
                })}
              </div>
              
              {/* LEGEND */}
              <div className="flex gap-4 mt-4 text-xs text-gray-600 justify-center">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded inline-block"></span> Available</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded inline-block"></span> Locked</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded inline-block"></span> Booked</div>
              </div>

              {/* ACTION BOTTOM BAR (Shows up only when a seat is picked) */}
              {selectedSeat && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-800 font-medium">You selected seat:</p>
                    <h4 className="text-xl font-bold text-blue-900">{selectedSeat.seatNumber}</h4>
                  </div>
                  <button 
                    onClick={handleLockSeat}
                    disabled={isLocking}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition"
                  >
                    {isLocking ? "Locking Seat..." : "Reserve & Book Now"}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EventDetails;
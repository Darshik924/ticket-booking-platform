interface eventType {
  id: number;
  name: string;
  venue: string;
  date: string;
  totalSeats: number;
  availableSeats: number;
}

interface seatType {
  id: number;
  seatNumber: string;
  status: "AVAILABLE" | "LOCKED" | "BOOKED";
}

interface bookingType {
  id: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  seat: {
    seatNumber: string;
     eventId: number;    // ✅ only eventId, no event object
     event?: eventType; // Optional event object, can be undefined
  };
  
}

export type { eventType, seatType, bookingType };

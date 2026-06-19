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
    event: {
      name: string;
      venue: string;
      date: string;
    };
  };
}

export type { eventType, seatType, bookingType };

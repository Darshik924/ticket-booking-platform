interface eventType {
  id: number;
  name: string;
  venue: string;
  date: string;
  totalSeats: number;
  availableSeats: number;
}

enum ROLE {
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
}

interface userType {
  name: string;
  id: number;
  role: ROLE;
  email: string;
}

interface AuthContextType {
  user: userType | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

export type { eventType, seatType, bookingType, userType, AuthContextType };
export { ROLE };

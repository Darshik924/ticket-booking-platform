
import http from "k6/http";
import { check, sleep } from "k6";

// Flash sale test configuration
export const options = {
  stages: [
    { duration: "10s", target: 10 },  // Ramp up to 10 users quickly
    { duration: "20s", target: 30 },  // Increase load
    { duration: "30s", target: 50 },  // Maintain moderate load
    { duration: "10s", target: 0 },   // Ramp down
  ],

  // Performance expectations
  thresholds: {
    http_req_failed: ["rate<0.05"],      // Less than 5% failures
    http_req_duration: ["p(95)<2000"],   // 95% requests under 2 sec
  },
};

// Base URL of backend API
const BASE_URL = "http://localhost:5000/api";


// Fetch the target event before the test starts
export function setup() {
  const eventsRes = http.get(`${BASE_URL}/events`);
  if (eventsRes.status !== 200) {
    throw new Error(`Failed to fetch events: ${eventsRes.status} ${eventsRes.body}`);
  }
  const body = JSON.parse(eventsRes.body);
  const events = body.events || [];
  if (!events.length) {
    throw new Error("No events found to test!");
  }
  // Target the first event for load testing
  const eventId = events[5].id;
  return { eventId };
}

// Global variable per VU thread to store auth token
let token = null;

// Runs for every virtual user iteration
export default function (data) {
  const eventId = data.eventId;

  // 1. Dynamic User Registration & Login (run once per VU thread)
  if (!token) {
    const username = `vu_user_${__VU}_${Math.floor(Math.random() * 1000000)}`;
    const email = `${username}@example.com`;
    const password = "password123";

    // Attempt registration
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        name: username,
        email: email,
        password: password,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (registerRes.status === 201) {
      token = JSON.parse(registerRes.body).token;
    } else {
      // Fallback to login in case the user already exists
      const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
          email: email,
          password: password,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      if (loginRes.status === 200) {
        token = JSON.parse(loginRes.body).token;
      }
    }
  }

  if (!token) {
    console.error(`VU ${__VU} failed to authenticate.`);
    sleep(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Poll Event Seatmap (simulates waiting queue room)
  let seatMapRes = null;
  let isActive = false;
  let queueRetries = 0;
  const maxQueueRetries = 30; // Wait up to 30 seconds

  while (!isActive && queueRetries < maxQueueRetries) {
    seatMapRes = http.get(`${BASE_URL}/events/${eventId}/seats`, { headers });

    check(seatMapRes, {
      "seat map response received": (r) => r.status === 200 || r.status === 202,
    });

    if (seatMapRes.status === 200) {
      const body = JSON.parse(seatMapRes.body);
      if (body.status === "ACTIVE") {
        isActive = true;
        break;
      }
    } else if (seatMapRes.status === 202) {
      // User is in the waiting queue, sleep and retry
      sleep(1);
      queueRetries++;
    } else {
      // Unexpected status code
      break;
    }
  }

  if (!isActive || !seatMapRes) {
    console.warn(`VU ${__VU} timed out or failed while waiting in queue.`);
    sleep(1);
    return;
  }

  // 3. Select an available seat randomly
  const body = JSON.parse(seatMapRes.body);
  const seats = body.seats || [];
  const availableSeats = seats.filter((s) => s.status === "AVAILABLE");

  if (availableSeats.length === 0) {
    // No available seats left for this event
    sleep(1);
    return;
  }

  const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
  const seatId = randomSeat.id;

  // 4. Lock the selected seat
  const lockRes = http.post(
    `${BASE_URL}/seats/${eventId}/${seatId}/lock`,
    null,
    { headers }
  );

  check(lockRes, {
    "lock seat response received": (r) => r.status === 200 || r.status === 400 || r.status === 403,
  });

  if (lockRes.status !== 200 && lockRes.status !== 201) {
    // Lock failed (e.g. seat got locked by someone else just before our request)
    sleep(1);
    return;
  }

  // 5. Proceed to Booking / Payment
  const payRes = http.post(
    `${BASE_URL}/payment/pay`,
    JSON.stringify({
      eventId: eventId,
      seatId: seatId,
    }),
    { headers }
  );

  check(payRes, {
    "payment accepted": (r) => r.status === 202,
  });

  if (payRes.status !== 202) {
    sleep(1);
    return;
  }

  // 6. Poll for Booking Confirmation (as payment processing is async)
  let bookingConfirmed = false;
  let bookingRetries = 0;
  const maxBookingRetries = 15; // Wait up to 15 seconds for BullMQ worker

  while (!bookingConfirmed && bookingRetries < maxBookingRetries) {
    sleep(1);
    bookingRetries++;

    const myBookingsRes = http.get(`${BASE_URL}/bookings/my`, { headers });
    if (myBookingsRes.status === 200) {
      const myBookings = JSON.parse(myBookingsRes.body).bookings || [];
      const booking = myBookings.find((b) => b.seatId === seatId);
      if (booking) {
        if (booking.status === "CONFIRMED") {
          bookingConfirmed = true;
          break;
        } else if (booking.status === "CANCELLED") {
          break;
        }
      }
    }
  }

  check(bookingConfirmed, {
    "booking successfully confirmed": (val) => val === true,
  });

  sleep(1);
}

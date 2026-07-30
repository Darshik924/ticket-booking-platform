// overall user flow through the ticket booking platfrom
import http from "k6/http";
import { check, sleep } from "k6";

// End-to-End User Journey Test
export const options = {
  vus: 50, // Simulate 50 users
  duration: "5m", // Run for 5 minutes

  thresholds: {
    http_req_failed: ["rate<0.05"], // Less than 5% failures
    http_req_duration: ["p(95)<2000"], // 95% requests under 2 sec
  },
};

// Base API URL
const BASE_URL = "http://localhost:5000/api";

// Login once before test starts
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: "test@gmail.com",
      password: "123456",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  // Extract JWT token
  const token = JSON.parse(loginRes.body).token;

  return { token };
}

// Executed repeatedly by each virtual user
export default function (data) {
  const token = data.token;

  // Step 1: Get all available events
  const eventsRes = http.get(`${BASE_URL}/events`);

  check(eventsRes, {
    "events fetched": (r) => r.status === 200,
  });

  const events = JSON.parse(eventsRes.body);

  // Stop if no events found
  if (!events.length) {
    return;
  }

  // Select first event
  const eventId = events[0].id;

  // Step 2: Get seat map of selected event
  const seatsRes = http.get(`${BASE_URL}/events/${eventId}/seats`);

  check(seatsRes, {
    "seat map fetched": (r) => r.status === 200,
  });

  // Generate seat IDs between 201-700
  const seatId = ((__ITER * 10 + __VU) % 500) + 201;

  // Step 3: Lock seat
  const lockRes = http.post(`${BASE_URL}/seats/${seatId}/lock`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Skip booking if lock fails
  if (lockRes.status !== 200) {
    return;
  }

  // Notes: Please note that we do not use POST /bookings end point anymore so update all the current logic related to that
  // Step 4: should be something like hitting /pay and letting the background worker do its thing

  // Step 5: Fetch user's bookings
  const myBookingsRes = http.get(`${BASE_URL}/bookings/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(myBookingsRes, {
    "my bookings fetched": (r) => r.status === 200,
  });

  // Simulate user think time
  sleep(1);
}

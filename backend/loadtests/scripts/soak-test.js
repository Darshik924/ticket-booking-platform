import http from "k6/http";
import { check, sleep } from "k6";

// Soak test configuration
export const options = {
  vus: 100, // Keep 100 users active
  duration: "30m", // Run continuously for 30 minutes

  thresholds: {
    http_req_failed: ["rate<0.05"], // < 5% failures
    http_req_duration: ["p(95)<2000"], // 95% requests < 2 sec
  },
};

const BASE_URL = "http://localhost:5000/api";

// Login once before test starts
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: "test@gmail.com",
      password: "12345",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const token = JSON.parse(loginRes.body).token;

  return { token };
}

// Executed repeatedly by each VU
export default function (data) {
  const token = data.token;

  // Generate seat IDs between 201-700
  const seatId = ((__ITER * 10 + __VU) % 500) + 201;

  // Step 1: Lock seat
  const lockRes = http.post(`${BASE_URL}/seats/${seatId}/lock`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Skip booking if seat lock fails
  if (lockRes.status !== 200) {
    sleep(2);
    return;
  }

  // Step 2: Create booking
  const bookingRes = http.post(
    `${BASE_URL}/bookings`,
    JSON.stringify({
      seatId,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  // Verify booking success
  check(bookingRes, {
    "booking successful": (r) => r.status === 201,
  });

  // Simulate user think time
  sleep(2);
}

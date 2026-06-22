import http from "k6/http";
import { check, sleep } from "k6";

// Spike Test Configuration
export const options = {
  stages: [
    { duration: "30s", target: 50 },    // Normal traffic

    { duration: "5s", target: 500 },    // Sudden spike

    { duration: "30s", target: 500 },   // Sustain spike

    { duration: "5s", target: 50 },     // Sudden drop

    { duration: "30s", target: 50 },    // Recovery phase

    { duration: "10s", target: 0 },     // End test
  ],

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

const BASE_URL = "http://localhost:5000/api";

// Login once
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
    }
  );

  const token = JSON.parse(loginRes.body).token;

  return { token };
}

export default function (data) {
  const token = data.token;

  // Generate seat IDs
  const seatId = ((__ITER * 10 + __VU) % 500) + 201;

  // Lock Seat
  const lockRes = http.post(
    `${BASE_URL}/seats/${seatId}/lock`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (lockRes.status !== 200) {
    return;
  }

  // Create Booking
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
    }
  );

  check(bookingRes, {
    "booking successful": (r) => r.status === 201,
  });

  sleep(1);
}
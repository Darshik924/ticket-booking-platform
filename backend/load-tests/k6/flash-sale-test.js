
import http from "k6/http";
import { check } from "k6";

// Flash sale test configuration
export const options = {
  stages: [
    { duration: "30s", target: 50 },   // Ramp up to 50 users
    { duration: "30s", target: 100 },  // Increase load
    { duration: "30s", target: 150 },  // Heavy traffic
    { duration: "30s", target: 200 },  // Flash sale peak
    { duration: "30s", target: 0 },    // Ramp down
  ],

  // Performance expectations
  thresholds: {
    http_req_failed: ["rate<0.05"],      // Less than 5% failures
    http_req_duration: ["p(95)<2000"],   // 95% requests under 2 sec
  },
};

// Base URL of backend API
const BASE_URL = "http://localhost:5000/api";

// Login once before the test starts
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

  // Extract JWT token from login response
  const token = JSON.parse(loginRes.body).token;

  return { token };
}

// Runs for every virtual user iteration
export default function (data) {
  // Reuse token generated during setup //only one loggeed user will do bookings not always login->lock->book 
  const token = data.token;

// Event 2 seats range from 201 to 700
const seatId = ((__ITER * 10 + __VU) % 500) + 201;

  // Step 1: Lock seat using Redis
  const lockRes = http.post(
    `${BASE_URL}/seats/${seatId}/lock`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Stop if seat lock fails
  if (lockRes.status !== 200) {
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
    }
  );

  // Verify booking success
  check(bookingRes, {
    "booking successful": (r) => r.status === 201,
  });
}
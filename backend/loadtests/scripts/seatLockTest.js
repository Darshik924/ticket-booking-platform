import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 10,//virtual users
  iterations: 10,//total iterations for the test
};

const BASE_URL = "http://localhost:5000/api";

export default function () {
  // Login
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
    }
  );

  if (loginRes.status !== 200) return;

  const token = JSON.parse(loginRes.body).token;

  // ALL users target same seat
  const seatId = 1;

  const lockRes = http.post(
    `${BASE_URL}/seats/${seatId}/lock`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(lockRes, {
    "lock success or conflict": (r) =>
      r.status === 200 || r.status === 409,
  });
}
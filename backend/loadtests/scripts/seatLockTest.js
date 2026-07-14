import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

/* This is the main Load test for our app that tests and proofs the ZERO overselling of tickets,  */

/*
  Spike test for read-heavy / browse routes (GET /api/events, GET /api/events/:id).

  Goal: To prove that no matter how many users target the same seat we will have only one user who would
  successfully lock the seat and all the others would fail at locking (eg., Over here we have 1 success and 499 failures).

  In order to have 500 users target the same seat i have first registered 500 new users into the database 
  to make out work easier and then executed the load test 
*/

// This is experimental data, you will have to change these for a accurate test
// ---------CONFIG------------ --> Please change the config data to match your own data and what data u want to aim
const BASE_URL = "http://localhost:5000/api";
const SEAT_ID = 147;
const EVENT_ID = 5;
const USER_COUNT = 500;
const PASSWORD = "12345";

// We will use Custom counters so we can see the EXACT outcome breakdown in the summary,
// Not a pass/fail rate.
const lockSuccess = new Counter("seat_lock_success");
const lockConflict = new Counter("seat_lock_conflict");
const lockUnexpected = new Counter("seat_lock_unexpected");

export const options = {
  scenarios: {
    seat_lock_race: {
      executor: "per-vu-iterations",
      vus: USER_COUNT,
      iterations: 1,
      maxDuration: "30s",
    },
  },
  thresholds: {
    // If Redis locking is atomic, exactly one request should ever succeed.
    // We should have all of these thresholds as a success

    seat_lock_success: ["count==1"],
    // Only one should have a seat Locked
    seat_lock_conflict: ["count>=9"],
    // Exactly 499 should have seat Unlocked (9 was a mistake during testing)
    seat_lock_unexpected: ["count==0"],
  },
};
/* Notes: Document how only 1 sucess is observed and 499 failures are observed when 500 users target the same seat */

// setup() runs once, before any VU starts. We register new 500 VUs into the db each with their own tokens and then Run the test using these new VUs targetting the same seat id 147
// I do realise it would have been easier to just login 500 users from the same token but that was not giving satisfactory load test results. Besides we were able to simulate an accurate load testing scenario with 500 different users
/* Since we should focus more on seatLock here */
export function setup() {
  const users = [];
  const timestamp = Date.now();

  for (let i = 0; i < USER_COUNT; i++) {
    const email = `seatlock_${timestamp}_${i}@example.com`;
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        name: `Seat Lock User ${i + 1}`,
        email,
        password: PASSWORD,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (registerRes.status !== 201) {
      throw new Error(
        `Setup registration failed with status ${registerRes.status}: ${registerRes.body}`,
      );
    }

    const token = JSON.parse(registerRes.body).token;
    users.push(token);
  }

  return { users };
}

export default function (data) {
  const token = data.users[__VU - 1];
  const lockRes = http.post(
    `${BASE_URL}/seats/${EVENT_ID}/${SEAT_ID}/lock`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  // Updating our Counters here 
  if (lockRes.status === 200) {
    lockSuccess.add(1);
  } else if (lockRes.status === 409) {
    lockConflict.add(1);
  } else {
    lockUnexpected.add(1);
    console.error(`Unexpected status ${lockRes.status}: ${lockRes.body}`);
  }

  check(lockRes, {
    "response is 200 (won) or 409 (conflict), nothing else": (r) =>
      r.status === 200 || r.status === 409,
  });
}

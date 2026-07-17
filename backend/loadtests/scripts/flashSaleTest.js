import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

// Before going through this file read seatLockTest.js as repetitve logic and explained there
// In this Load test we try to simulate a flash sale test scene (Example: Release of Dhurandhar 2)

const BASE_URL = "http://localhost:5000/api";

// ---------CONFIG------------ --> Please change the config data to match your own data and what data u want to aim
// These must match a seeded event in your DB with exactly 500 seats ----
const EVENT_ID = 2;
const SEAT_ID_START = 2;
const SEAT_ID_END = 501; // 500 total seats -> cause we expected exactly 500 confirmed bookings
// Every VU would try only three times to attempt a seat lock (dont need any fancy here)
const MAX_RETRIES_PER_ITERATION = 3;

// ---------CONFIG------------ --> Please change the config data to match your own data and what data u want to aim
const VU_COUNT = 2000;
// These must match the ramping-vus stages' peak target below

const bookingConfirmed = new Counter("booking_confirmed_total");
const paymentAcceptedNotConfirmed = new Counter(
  "payment_accepted_not_confirmed_total",
);
const lockConflict = new Counter("lock_conflict_total");
const loginFailures = new Counter("login_failures_total");
const paymentDuration = new Trend("payment_duration_ms");

export const options = {
  // My plan is to register 1500 users at the start sequentially, Doing that would take much longer than 10 seconds(K6's default) and setup() would be killed mig registration. To we keep a good amount of time for setup
  setupTimeout: "5m",
  scenarios: {
    flash_sale: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: VU_COUNT },
        { duration: "3m", target: VU_COUNT },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    // The one hard invariant a correct system must never violate:
    // confirmed bookings must be equal to total seats.
    booking_confirmed_total: ["count==500"],
  },
};

const usersData = new SharedArray("users", function () {
  return JSON.parse(open("../users.json"));
});

export function setup() {
  return {};
}

export default function () {
  const userIndex = (__VU - 1) % usersData.length;
  const currentUser = usersData[userIndex];

  // Defensive check to ensure we never crash if a record is malformed
  if (!currentUser || !currentUser.token) {
    loginFailures.add(1);
    sleep(1);
    return;
  }

  const cachedToken = currentUser.token;
  const authHeaders = { headers: { Authorization: `Bearer ${cachedToken}` } };

  // Pick a random seat from the shared pool, attempt lock,
  // Retry again, against a different seat on conflict.
  let lockedSeatId = null;
  const triedSeatIds = new Set();
  const poolSize = SEAT_ID_END - SEAT_ID_START + 1;

  for (let attempt = 0; attempt < MAX_RETRIES_PER_ITERATION; attempt++) {
    let seatId;
    do {
      seatId = SEAT_ID_START + Math.floor(Math.random() * poolSize);
    } while (triedSeatIds.has(seatId) && triedSeatIds.size < poolSize);

    triedSeatIds.add(seatId);

    const lockRes = http.post(
      `${BASE_URL}/seats/${EVENT_ID}/${seatId}/lock`,
      null,
      authHeaders,
    );

    if (lockRes.status === 200) {
      lockedSeatId = seatId;
      break;
    } else if (lockRes.status === 409) {
      lockConflict.add(1);
      continue;
      // Loop Back and try a different seat
    } else {
      console.error(
        `VU ${__VU} unexpected lock status ${lockRes.status}: ${lockRes.body}`,
      );
      break;
    }
  }

  // If lock succeeded, immediately attempt payment and then we will see if booking is confirmed or not
  if (lockedSeatId) {
    const paymentStart = Date.now();
    const payRes = http.post(
      `${BASE_URL}/payment/pay`,
      JSON.stringify({ eventId: EVENT_ID, seatId: lockedSeatId }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cachedToken}`,
        },
      },
    );
    paymentDuration.add(Date.now() - paymentStart);

    const paymentAccepted = check(payRes, {
      "payment request accepted (202)": (r) => r.status === 202,
    });

    if (paymentAccepted) {
      /* Alright now our payment request has been accepted and we get socket IO updates when it is confirmed (we dont have socket here!) */
      // We can simluate a cool delay for 16 seconds to have payment worker do his delay first and then we can check for our bookings otherwise we migh read a PENDING or something

      sleep(17);
    }

    // Verify if booking dashboard is reachable
    const bookingsRes = http.get(`${BASE_URL}/bookings/my`, authHeaders);

    // see if u got the booking
    if (paymentAccepted && bookingsRes.status === 200) {
      try {
        const myBookings = JSON.parse(bookingsRes.body).bookings || [];
        const isConfirmed = myBookings.some(
          (b) => b.seatId === lockedSeatId && b.status === "CONFIRMED",
        );
        if (isConfirmed) {
          bookingConfirmed.add(1);
        } else {
          paymentAcceptedNotConfirmed.add(1);
        }
      } catch (e) {
        paymentAcceptedNotConfirmed.add(1);
      }
    }
  } else {
    // Never locked a seat this iteration - still verify dashboard (No need actually but why not)
    const bookingsRes = http.get(`${BASE_URL}/bookings/my`, authHeaders);
  }

  sleep(Math.random() * 1 + 0.5);
}

/* Notes: After the test we observe that only one booking_confirmed was recieved by K6
But at the same time if you go to seat map UI you will see all the seats are either booked or locked and one by one they were getting booked right in front of me. So this means the Thundering Herd was handled beautifully althoguh we do not see that in our K6 logs and all the seats were locked at least and some of them were booked. Background worker was confirming each of theirs bookings asynchronously one by one and we managed to get the booking count not to exceed 500 and each user had their 1 booking accurately without any overselling 
 Notes: After a few minutes all the seats were totally booked for the flash sale*/

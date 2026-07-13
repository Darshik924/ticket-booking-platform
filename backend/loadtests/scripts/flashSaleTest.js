import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:5000/api";

// ---- CONFIG: must match a seeded event in your DB with exactly 500 seats ----
const EVENT_ID = 6;
const SEAT_ID_START = 176;
const SEAT_ID_END = 675; // 500 total seats -> cause we expected exactly 500 confirmed bookings
// Every VU would try only three times to attempt a seat lock (dont need any fancy here)
const MAX_RETRIES_PER_ITERATION = 3;

// ---- CONFIG: users are registered fresh in setup(), no pre-seeding needed ----
const VU_COUNT = 1500; // must match the ramping-vus stages' peak target below
const PASSWORD = "12345";

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
        { duration: "1m", target: 1500 },
        { duration: "3m", target: 1500 },
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

// setup() runs once, before any VU starts. We register VU_COUNT brand-new
// users here and hand back their tokens, indexed so each VU maps to exactly
// one distinct account (data.users[__VU - 1]) - no shared tokens, and no
// per-VU login round trip needed once the test is actually running.
export function setup() {
  const users = [];
  const timestamp = Date.now();

  for (let i = 0; i < VU_COUNT; i++) {
    const email = `flashsaleTRY2_${timestamp}_${i}@example.com`;
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        name: `Flash_Sale_User_TRY2 ${i + 1}`,
        email,
        password: PASSWORD,
      }),
      { headers: { "Content-Type": "application/json" } },
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
  const cachedToken = data.users[__VU - 1];
  if (!cachedToken) {
    loginFailures.add(1);
    sleep(1);
    return;
    // Nothing to do this iteration without auth
  }

  const authHeaders = { headers: { Authorization: `Bearer ${cachedToken}` } };

  // Viewing all the Available Listing (though we dont really need to since we target only ONE EVENT)
  const eventsRes = http.get(`${BASE_URL}/events`, authHeaders);
  check(eventsRes, { "events list loaded": (r) => r.status === 200 });

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
      check(lockRes, {
        "lock request returned a known status (200/409)": () => false,
      });
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
      // We can simluate a cool delay for 4 seconds to have payment worker do his delay first and then we can check for our bookings otherwise we migh read a PENDING or something

      sleep(4);
    }

    // Verify if booking dashboard is reachable
    const bookingsRes = http.get(`${BASE_URL}/bookings/my`, authHeaders);
    check(bookingsRes, {
      "bookings dashboard reachable": (r) => r.status === 200,
    });

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
    check(bookingsRes, {
      "bookings dashboard reachable": (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 1 + 0.5);
}


/* Notes: After the test we observe that only one booking_confirmed was recieved by K6
But at the same time if you go to seat map UI you will see all the seats are either booked or locked and one by one they were getting booked right in front of me. So this means the Thundering Herd was handled beautifully althoguh we do not see that in our K6 logs and all the seats were locked at least and some of them were booked. Background worker was confirming each of theirs bookings asynchronously one by one and we managed to get the booking count not to exceed 500 and each user had their 1 booking accurately without any overselling 
 Notes: After a few minutes all the seats were totally booked for the flash sale*/
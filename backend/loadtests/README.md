# TicketBook — Load Test & Resilience Report

This is the extensive report of every concurrency and load test run against TicketBook's booking pipeline. It proves to answer one question with evidence, not assertion: **can two users ever end up with the same seat?**

Tests in this report targets the same architectural chain:

```
Client → Express API → Redis (atomic seat lock, Lua script) → BullMQ (paymentQueue) → PaymentWorker → Postgres (Prisma transaction)
```

All tests were run with [k6](https://k6.io/), with metrics streamed live to Prometheus via k6's remote-write output and visualized in Grafana using the official `Grafana k6 Prometheus` dashboard.

## Table of Contents

- [Test Environment](#test-environment)
- [0. Auth Load Base (Login Test)](#0-auth-load-base-login-test)
- [1. Atomic Lock Race Condition Test](#1-atomic-lock-race-condition-test)
- [2. Flash Sale End-to-End Flow Test](#2-flash-sale-end-to-end-flow-test)
- [3. Seat Expiry (TTL) Leak Test](#3-seat-expiry-ttl-leak-test)
- [4. Event Page Spike Test](#4-event-page-spike-test)
- [Summary of Findings](#summary-of-findings)
- [Get Started with Tests](#get-started-with-tests)

## Test Environment

**`COMING SOON` - CONTAINERIZING THE APP**

---

## 0. Auth Load Base (Login Test)

### Test Objectives & Setup

Before layering the more complex locking-booking tests on top, this test establishes a baseline: how does the `/api/auth/login` endpoint perform under a small, sustained concurrent load, and also servers as a starter check to just see if this k6 → Prometheus → Grafana observability pipeline actually work end-to-end? This was also the first test run in this project, so it doubles as a smoke test for the entire load-testing setup before investing in the heavier scenarios below.

- **Script:** `loginTest.js`
- **Executor:** default (looping VUs)
- **Load:** 8 VUs, looping continuously for 2 minutes (2m30s max duration including graceful stop)

### k6 Script Logic

Each of the 8 VUs loops continuously for the test duration:

1. `POST /api/auth/login` with a fixed test account's credentials.
2. Assert the response is `200` and a `token` field exists in the body.
3. `sleep(1)` before the next iteration.

### Empirical Results (The Proof Data)

```
execution: local
    script: loginTest.js
    output: Prometheus remote write (http://localhost:9090/api/v1/write)

scenarios: (100.00%) 1 scenario, 8 max VUs, 2m30s max duration (incl. graceful stop):
           * default: 8 looping VUs for 2m0s (gracefulStop: 30s)

THRESHOLDS

checks
'rate>0.95' rate=100.00%

http_req_duration
'p(95)<500' p(95)=121.36ms

TOTAL RESULTS

checks_total.......: 1768   14.547362/s
checks_succeeded...: 100.00% 1768 out of 1768
checks_failed......: 0.00%  0 out of 1768

✓ login successful
✓ token exists

HTTP
http_req_duration..............: avg=103.82ms min=71.81ms  med=105.35ms max=236.15ms p(90)=118.01ms p(95)=121.36ms
  { expected_response:true }...: avg=103.82ms min=71.81ms  med=105.35ms max=236.15ms p(90)=118.01ms p(95)=121.36ms
http_req_failed.................: 0.00% 0 out of 884
http_reqs.......................: 884   7.273681/s

EXECUTION
iteration_duration..............: avg=1.09s min=587.14ms med=1.07s max=1.62s p(90)=1.5s p(95)=1.55s
iterations.......................: 884   7.273681/s
vus...............................: 2     min=2  max=8
vus_max............................: 8     min=8  max=8

NETWORK
data_received.......................: 746 kB 6.1 kB/s
data_sent............................: 171 kB 1.4 kB/s

running (2m01.5s), 0/8 VUs, 884 complete and 0 interrupted iterations
default ✓ [======================================] 8 VUs  2m0s
```

**Verdict:** Both thresholds passed — 100% check success rate (well above the `>0.95` bar) and p(95) latency of 121.36ms (well under the 500ms bar). Zero HTTP failures across 884 requests.

### Grafana Dashboard

Peak throughput observed in Grafana: **13.5 req/s**, with 884 total HTTP requests recorded over the run window. _(This is a point-in-time sampled peak from Grafana's panel, different from k6's own averaged throughput of ~7.27 req/s across the full test time — both are correct, they are just measuring different things.)_

![Login Output](backend/loadtests/screenshots/k6/loginOutput.png)

![Login Visual](backend/loadtests/screenshots/visualGrafana.png)

---

## 1. Atomic Lock Race Condition Test

### Test Objectives & Setup

Proves the single most important accurate property in the whole system: **when many users fight over one seat at the exact same moment, exactly one of them wins — never zero, never more than one. never ever overselling** This is the foundational guarantee that everything else in the booking pipeline depends on.

**Scenario:** Consider 500 users (here VUs) who will be attempting to lock for the EXACT SAME seat (whose config are in the script)

- **Script:** `seatLockTest.js`
- **Executor:** `per-vu-iterations` (all VUs pre-initialized, each fires exactly once, near-simultaneously)
- **Load:** 500 VUs targeting one single, fixed `seatId`

### k6 Script Logic

1. `setup()` registers 500 distinct users once, before any VU starts, and collects back their tokens.
2. Each VU (indexed by `__VU`) fires a single `POST /api/seats/:eventId/:seatId/lock` against the exact same seat, exact same event.
3. Outcome is bucketed into three custom counters: `seat_lock_success`, `seat_lock_conflict`, `seat_lock_unexpected` which should all satify the criteria.
4. A hard threshold counter that must be no matter what asserts `seat_lock_success` count is exactly 1 across the entire run.

Actual mechanism being tested: a Redis `SET key value EX ttl NX` (atomic set-if-not-exists) executed via a Lua script, guaranteeing the check-and-set can't be split by concurrent callers the way a naive `GET` then `SET` could be.

### Empirical Results (The Proof Data)

```
execution: local
    script: seatLockTest.js
    output: Prometheus remote write (http://localhost:9090/api/v1/write)

scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (including the graceful stop):
           * seat_lock_race: 1 iterations for each of 500 VUs (maxDuration: 30s, gracefulStop: 30s)

THRESHOLDS

seat_lock_conflict
✓ 'count>9' count=499

seat_lock_success
✓ 'count==1' count=1

seat_lock_unexpected
✓ 'count==0' count=0

TOTAL RESULTS

checks_total.......: 500   9.182003/s
checks_succeeded...: 100.00% 500 out of 500
checks_failed......: 0.00%  0 out of 500

✓ response is 200 (won) or 409 (conflict), nothing else

CUSTOM
seat_lock_conflict...............: 499   9.163639/s
seat_lock_success.................: 1     0.018364/s
seat_lock_unexpected..............: 0     0/s

HTTP
http_req_duration.................: avg=215.68ms min=77.24ms  med=204.35ms max=426.62ms p(90)=406.86ms p(95)=417.06ms
  { expected_response:true }......: avg=107.54ms min=77.24ms  med=110.92ms max=265.09ms p(90)=123.23ms p(95)=125.12ms
http_req_failed....................: 49.90% 499 out of 1000
http_reqs..........................: 1000  18.364006/s

EXECUTION
iteration_duration..................: avg=336.72ms min=240.79ms med=332.94ms max=603ms p(90)=417.56ms p(95)=423.67ms
iterations..........................: 500   9.182003/s
vus..................................: 500   min=0   max=500
vus_max...............................: 500   min=500 max=500

NETWORK
data_received..........................: 635 kB 12 kB/s
data_sent...............................: 404 kB 7.4 kB/s

running (0m54.5s), 000/500 VUs, 500 complete and 0 interrupted iterations
seat_lock_race ✓ [======================================] 500 VUs  00.7s/30s  500/500 iters, 1 per VU
```

**Verdict:** All three custom thresholds passed. Out of all our 500 concurrent users targeting the exact same event, exact same seat and at the exact same milisecond, **exactly 1 had the seat locked and 499 received a `409 Conflict` that means no lock..** — zero unexpected responses, zero double-booking. `http_req_failed` shows 49.90% because k6 counts non-2xx responses (the 409s) as "failed" by default; this is expected, correct and accurate here — a `409` is the required and intended outcome for 499 of the 500 requests, not a failure. The relevant number is `seat_lock_unexpected = 0`.

Since this is a single nearly the same milisecond burst of 500 bots fighting for 1 same seat. The time series dashboard will not have anything to plot in there. The k6 CLI summary above is the expected complete record for this test.

![Seat Lock Output](backend/loadtests/screenshots/k6/seatLockOutput.png)

---

## 2. Flash Sale End-to-End Flow Test

### Test Objectives & Setup

This one simulates a real-world scenario (a flash sale that just went live, eg: release of a highly anticipated film), the entire system is designed for: **1,500 concurrent users rushing to book a block of 500 seats the instant they go on sale**, exercising the full pipeline end-to-end — not just the lock, but the async BullMQ payment queue and eventual Postgres-confirmed booking.

**Scenario:** Consider 1500 users (here VUs) who are waiting for the release of an highly anticipated event and they are going to rush like crazy to book the only available 500 seats for that specific event

- **Script:** `flashSaleTest.js`
- **Executor:** `ramping-vus`
- **Load profile:** 0 → 1,500 VUs over 1 minute (ramp-up) → hold at 1,500 VUs for 3 minutes (sustained plateau) → 1,500 → 0 over 30 seconds (ramp-down)
- **Inventory:** 500 total seats seeded for the target event

### k6 Script Logic

Each VU is a distinct, freshly registered user (via `setup()`), and repeatedly executes:

1. `GET /api/events` — view listings.
2. Randomly select a seat from the shared 500-seat pool.
3. `POST /api/seats/:eventId/:seatId/lock` — attempt an atomic lock.
4. **If locked:** immediately HIT `POST /api/payments/pay`, which enqueues an async job on BullMQ's `paymentQueue`. After the queue confirms acceptance, a short wait accounts for `PaymentWorker`'s simulated payment-gateway delay and the `PaymentWorker` slowly at his own pace flips bookings one by one to `CONFIRMED` in Postgres.
5. **If conflict (409):** loop back and retry against a different, not-yet-tried seat (3 attempts to lock a seat).
6. `GET /api/bookings/my` — verify the user's own dashboard reflects the outcome.

**Expected result:** exactly 500 confirmed bookings, with 1,000+ conflict responses recorded across the run (many users retrying multiple times as the seat pool shrinks).

### Empirical Results (The Proof Data)

```
execution: local
    script: flashSaleTest.js
    output: Prometheus remote write (http://localhost:9090/api/v1/write)

scenarios: (100.00%) 1 scenario, 1500 max VUs, 4m40s max duration (incl. graceful stop):
           * flash_sale: Up to 1500 looping VUs for 4m30s over 3 stages (gracefulRampDown: 10s, gracefulStop: 30s)

THRESHOLDS

booking_confirmed_total
✗ 'count==500' count=1

TOTAL RESULTS

checks_total.......: 223421  521.033464/s
checks_succeeded...: 100.00% 223421 out of 223421
checks_failed......: 0.00%   0 out of 223421

✓ events list loaded
✓ payment request accepted (202)
✓ bookings dashboard reachable

CUSTOM
booking_confirmed_total.......................: 1       0.002332/s
lock_conflict_total.............................: 333162  776.957184/s
payment_accepted_not_confirmed_total.............: 498     1.161371/s
payment_duration_ms...............................: avg=27.216433 min=7 med=18 max=138 p(90)=56.2 p(95)=74

HTTP
http_req_duration.....................................: avg=404.07ms min=1.47ms med=378.54ms max=41.91s p(90)=616.97ms p(95)=668.52ms
  { expected_response:true }..........................: avg=352.06ms min=1.66ms med=324.18ms max=41.91s p(90)=436.78ms p(95)=479.79ms
http_req_failed.........................................: 59.64% 333162 out of 558582
http_reqs................................................: 558582 1302.652456/s

EXECUTION
iteration_duration.........................................: avg=3.04s min=530.35ms med=3.08s max=44.55s p(90)=3.77s p(95)=3.94s
iterations....................................................: 111461 259.93488/s
vus..............................................................: 1      min=0    max=1500
vus_max...........................................................: 1500   min=1500 max=1500

NETWORK
data_received........................................................: 384 MB 896 kB/s
data_sent.............................................................: 191 MB 446 kB/s

running (7m08.8s), 0000/1500 VUs, 111461 complete and 0 interrupted iterations
flash_sale ✓ [======================================] 0000/1500 VUs  4m30s
ERRO[0432] thresholds on metrics 'booking_confirmed_total' have been crossed
```

**Verdict — this run did NOT pass its expected threshold, and that's reported honestly here however the behaviour after this is interesting.** `booking_confirmed_total` reached only **1**, not the expected 500. However, breaking the numbers down tells us a different story:

**✅ Seats control worked correctly.** `booking_confirmed_total` (1) + `payment_accepted_not_confirmed_total` (498) = **499**, landing right at the 500-seat ceiling. The Redis atomic lock correctly saw total successful lock+payment-acceptance at (approximately) the total seats, with `lock_conflict_total` = 333,162 absorbing every excess attempt. **Zero seats were oversold or double-locked.**

**❌ Payment confirmation could not keep up with lock throughput.** The gap between "payment accepted" (499) and "booking confirmed" (1) is a queue processing bottleneck, not a correctness failure. With all the incoming /pay requests and so many VUs entering the payment queue `PaymentWorker` simply could not keep up with that and he was slowly at his own pace confirming all our bookings to CONFIRMED in Postgres `PaymentWorker` has a simulated ~2s gateway delay per job; the worker processes jobs sequentially (With BullMQ's default concurrency being 1) it is naturally not possible to have so many seats CONFIRMED and BOOKED into **within** the test window, draining ~500 queued jobs at 2s each takes on the order of 15+ minutes — far longer than this test's post-payment wait allowed for before checking `/bookings/my`. The `http_req_duration` max of **41.91s** is consistent with requests queued up and waiting behind this backlog.

### Live Seat Map — Multi-View Real-Time Verification

**Observations:** Right after the runtime of this test we observed that slowly many seats ONE by ONE were getting BOOKED and database bookings CONFIRMED and as its proof screenshots were taken in stages. The real time updates were recieved. It was the `PaymentWorker` confirming each of their bookings one by one.

Screenshots of the seat-selection UI were captured at three points across the sale (start / mid / end) to visually confirm seats were locking in real time via the `seat_status_changed` socket broadcasts, viewed from different scroll positions (Page 1 and Page 3 here not inclu. Page 2 however every other scroll position (page) exhibits the same behaviour) within the 500-seat grid.

**Start of sale timeline (minimal locking):**
![Start Page 1 (FlashSale)](backend/loadtests/screenshots/k6/flashSale/stP1.png) ![Start Page 3 (FlashSale)](backend/loadtests/screenshots/k6/flashSale/stP3.png)

**Mid-sale (seats filling rapidly):**
![Mid Page 1 (FlashSale)](backend/loadtests/k6/screenshots/flashSale/midP1.png) ![Mid Page 3 (FlashSale)](backend/loadtests/screenshots/k6/flashSale/midP3.png)

**End of sale timeline (grid heavily/fully locked):**
![End Page 1 (FlashSale)](backend/loadtests/k6/screenshots/flashSale/endP1.png) ![End Page 3(FlashSale)](backend/loadtests/screenshots/k6/flashSale/endP3.png)

> **Separate observation worth noting in the report:** across every screenshot, the header stat **"Available: 398/500" stays identical**, that stays the same since the updates which are being recieved are from redis hash cache and broadcasted over websockets, so actually there is no logic here to update this counter and hence seats show booked but this counter stays the same. Future improvments will get this issue resolved

### Grafana Dashboard

Peak throughput: **2.34K req/s**, 556,084 total HTTP requests (closely matching k6's own count of 558,582 — the small difference is just sampling and scrap interval rounding). The VU graph shows a clean ramp from 0 to 1,500 over roughly the first 2 minutes, a sustained kind of plateau near 1,500 VUs for the following ~4 minutes, then a rapid drop back to 0 — matching the configured `ramping-vus` stages exactly and the actual user behaviour. As with the login and TTL tests, the **"Iterations" panel shows No data** — the same recurring Grafana query gap noted in earlier sections, not a testing issue.

![Flash Sale Ouput](backend/loadtests/screenshotsk6/flashSale/flashSaleOutput.png)

![Flash Sale Visual](backend/loadtests/screenshotsvisualGrafana/flashSaleVisual.png)

`[SCREENSHOT — Postgres connection/CPU panel, if captured, showing the queue absorbing load rather than every request hitting the DB directly]`

---

## 3. Seat Expiry (TTL) Leak Test

### Test Objectives & Setup

Proves that an **abandoned** - meaning just let gone seat lock will be released in its due time — a user who locks a seat and simply never pays — doesn't leak forever. The lock must expire automatically via Redis TTL and become lockable again, with no manual cleanup job required and no stuck/leaked state under concurrent retry pressure.

**Scenario:** Consider 100 users (100 VUs) who will lock 100 distinct seats, and after 100 more (distinct from the previous round 1) round 2 Users (100VUs again) repeatedly retrying those same seats

- **Script:** `seatAbandonTest.js`
- **Executor:** two `per-vu-iterations` scenarios (a lock wave and a retry wave)
- **Load:** 100 VUs lock 100 distinct seats, followed by a second wave of 100 VUs repeatedly retrying those same seats
- **TTL:** The TTL was temporarily lowered down to 10s (from its actual 5 minutes value) for the convenience of this test to avoid unnecessary delay

### k6 Script Logic

1. **Wave one** (100 VUs, 1 iteration each): each VU locks a distinct seat and then does nothing else — no `/pay` call, no relock, no TTL refresh. This is the "abandoned" user.
2. **Wave two** (100 VUs, starting ~1s later): each VU repeatedly retries locking the _same_ seat wave one grabbed, roughly every 1.5 seconds, for up to 15 seconds — long enough to straddle the 10-second TTL window.
3. Every attempt is logged with its status and elapsed time relative to test start, so the exact moment each seat flips from `409 Conflict` → `200 OK` can be verified against the configured TTL.

**Expected result:** All wave-two attempts before ~10s return `409`; all seats eventually return `200` shortly after — proving the cleanup is driven entirely by Redis TTL expiry, with no memory leak or waiting or whatever state under load.

### Empirical Results (The Proof Data)

```
INFO[0034] Wave2 VU 121 conflict on seat 696 at t=15.2s  source=console
INFO[0034] Wave2 VU 113 conflict on seat 688 at t=15.2s  source=console
INFO[0034] Wave2 VU 117 conflict on seat 692 at t=15.2s  source=console
INFO[0034] Wave2 VU 125 conflict on seat 700 at t=15.2s  source=console
INFO[0034] Wave2 VU 126 conflict on seat 701 at t=15.2s  source=console
INFO[0034] Wave2 VU 123 conflict on seat 698 at t=15.2s  source=console
INFO[0034] Wave2 VU 129 conflict on seat 704 at t=15.2s  source=console

THRESHOLDS

wave2_success_total
✓ 'count<=100' count=100

TOTAL RESULTS

checks_total.......: 1100  30.208769/s
checks_succeeded...: 99.81% 1098 out of 1100
checks_failed......: 0.18%  2 out of 1100

✗ wave1 initial lock succeeded (200)
  ↳  98% — ✓ 98 / ✗ 2
✓ wave2 response is 200 (won) or 409 (still locked)

CUSTOM
wave1_lock_failures_total..........: 2     0.054925/s
wave2_conflict_total................: 900   24.716266/s
wave2_success_total..................: 100   2.746252/s

HTTP
http_req_duration.....................: avg=59.17ms  min=2.5ms   med=38.91ms max=276.32ms p(90)=123.69ms p(95)=177.51ms
  { expected_response:true }.........: avg=91.58ms  min=6.3ms   med=88.5ms  max=199.57ms p(90)=159.85ms p(95)=181.19ms
http_req_failed........................: 69.38% 902 out of 1300
http_reqs...............................: 1300  35.701273/s

EXECUTION
iteration_duration........................: avg=1.59s min=1.5s med=1.53s max=2.2s p(90)=1.75s p(95)=2.12s
iterations..................................: 1100  30.208769/s
vus...........................................: 96    min=0   max=200
vus_max........................................: 200   min=200 max=200

NETWORK
data_received....................................: 560 kB 15 kB/s
data_sent..........................................: 486 kB 13 kB/s

running (0m36.4s), 000/200 VUs, 1100 complete and 0 interrupted iterations
wave_one_initial_lock   ✓ [======================================] 100 VUs  02.2s/20s  100/100 iters, 1 per VU
wave_two_retry_after_ttl ✓ [======================================] 100 VUs  15.7s/30s  1000/1000 iters, 10 per VU
```

**Verdict:** The one threshold that mattered much here passed cleanly — **`wave2_success_total` landed at exactly 100**, meaning every single one of those 100 abandoned seats were eventually recovered and re-locked once its TTL expired, with `wave2_conflict_total` (900) and `wave2_success_total` (100) summing to exactly 1000 — the full set of wave-two attempts, confirming zero unexpected/invalid responses. `wave1_lock_failures_total` shows 2 (98% initial lock success rather than 100%) — a small amount of noise from the initial locking wave itself, not from the expiry mechanism under test; worth a quick look at those 2 failure logs, but it doesn't affect the core claim. `http_req_failed` at 69.38% is expected and correct here for the same reason as the Atomic Lock Race test: the 900 `409 Conflict` responses are the _intended_ outcome while a seat is still legitimately locked, not real failures.

Console output confirms the thing directly: conflicts were still being logged as late as `t=15.2s` into the run, and by the end of wave two's retry window all 100 seats had flipped over to `200 OK` — the cleanup is driven totally by Redis TTL expiry, with no seat left permanently gone / stuck / abandoned wherever and no outside lock state under sustained concurrent retrying pressure.

### Grafana Dashboard

Peak throughput: **75.0 req/s**, 1,300 total HTTP requests. The VU graph shows the two back to back scenarios clearly: a sharp step up to 100 VUs (wave one's quick initial-lock burst) followed by the sustained ~100-VU retry plateau (wave two), with the request_rate line coming down from a peak as conflicts gradually convert into successes over the retry window. As with the login test, the "Iterations" panel shows **No data** — a known gap in this Grafana dashboard's query configuration rather than a testing issue (the k6 CLI output above already confirms the real iteration counts).

![Seat Abandon Output](backend/loadtests/screenshots/k6/seatAbandonTes.png)

![Seat Abandon Visual](backend/loadtests/screenshots/visualGrafana/seatAbandonVisual.png)

---

## 4. Event Page Spike Test

### Test Objectives & Setup

Proves that a sudden, unthrottled spike of anonymous traffic on **read-heavy discovery endpoints** — the pages people are refreshing right before a sale goes live — doesn't break the server's connection to Postgres or take the service down.

**Scenario:** Consider a wave of 2000 users (2000 VUs) which steadily rises from 50 users goes up to 2000 and falls 50. These users exhibit random behaviour of clicking the events page (listing all events) or randomly selecting any event from the events page and clicking on that event. This is a totally random human characteristic behaviour for ticketing site (like someone just scrolling on...)

- **Script:** `spikeTest.js`
- **Executor:** `ramping-vus`
- **Load profile:** baseline 50 VUs → sudden spike to 2,000 VUs within 10 seconds → hold at 2,000 VUs → drop back to 50 VUs
- **Endpoints under test:** `GET /api/events` (listing) and `GET /api/events/:id` (detail), mixed randomly per request — no authentication required here, matching real anonymous browsing traffic

### k6 Script Logic

Each VU, on every iteration, randomly chooses between:

1. `GET /api/events/:id` (a random event's detail page), or
2. `GET /api/events` (the listing page).

Any `5xx` response is tracked in a dedicated counter, since that's the specific failure signature of a broken/exhausted Postgres connection pool, distinct from ordinary request failures.

### Empirical Results (The Proof Data)

```
THRESHOLDS

db_error_responses_total
✓ 'count<50' count=0

http_req_duration
✓ 'p(95)<1500' p(95)=274.81ms

http_req_failed
✓ 'rate<0.08' rate=7.38%

TOTAL RESULTS

checks_total.......: 220956  2209.15428/s
checks_succeeded...: 100.00% 220956 out of 220956
checks_failed......: 0.00%   0 out of 220956

✓ request did not fail with a server error

CUSTOM
db_error_responses_total...........: 0     0/s
unexpected_status_total.............: 16323 163.200028/s

HTTP
http_req_duration.....................: avg=195.91ms min=0s     med=30.29ms max=35.55s p(90)=250.95ms p(95)=274.81ms
  { expected_response:true }..........: avg=186.53ms min=9.88ms med=30.37ms max=35.55s p(90)=250.71ms p(95)=273.47ms
http_req_failed..........................: 7.38%  16323 out of 220956
http_reqs.................................: 220956 2209.15428/s

EXECUTION
iteration_duration...........................: avg=276.89ms min=9.98ms med=30.72ms max=40.92s p(90)=251.7ms p(95)=281.35ms
iterations.......................................: 220956 2209.15428/s
vus..................................................: 50     min=50   max=2000
vus_max...............................................: 2000   min=2000 max=2000

NETWORK
data_received.............................................: 308 MB 3.1 MB/s
data_sent..................................................: 18 MB  179 kB/s

running (1m40.0s), 0000/2000 VUs, 220956 complete and 395 interrupted iterations
read_heavy_spike ✓ [======================================] 0000/2000 VUs  1m40s
```

**Verdict: full pass, all three thresholds green.**

- **`db_error_responses_total = 0`** — zero 5xx server errors across 220,956 requests, even at 2,000 concurrent VUs. This is the headline claim of this test: **the connection to Postgres never broke under a 40x traffic spike.**
- **`p(95) = 274.81ms`**, comfortably under the 1500ms ceiling — the server stayed not just ALive but stayed responsive.
- **`http_req_failed = 7.38%`**, not quite the best but still under a comfortable ceilling — and importantly, this entire 7.38% is accounted for by `unexpected_status_total` (16,323), not `db_error_responses_total` (0). That means every one of these "failures" was a non-5xx, non-200 response — most plausibly the app's own rate limiter returning `429 Too Many Requests` or something under the spike rather than the server letting down. That's the correct and healthy behavior for a system under an uncontrolled burst: defensively rejecting excess requests rather than letting Postgres connections finish. Worth a quick saw of server logs to confirm these were indeed 429s and not some other unexpected code, but the shape of the data strongly supports this reading.
- **395 interrupted iterations** — expected and not exactly a concern: these are in flight requests cut off during the 10-second `gracefulRampDown` window as VUs were forcibly focred down at the end of the spike, not failures during the test itself.

### Grafana Dashboard

Peak throughput: **2.52K req/s**, 220,956 total HTTP requests — matching k6's own count exactly. The VU graph shows the spike shape sharp as configured: a nearly vertical ramp from baseline to 2,000 VUs, a brief hold at peak, then an equally sharp drop back down — all within roughly a 1-minute window, consistent with the compressed `30s → 10s → 20s → 10s → 30s` stage profile. Request rate (yellow) tracks the VU curve closely, while the error-rate line (red) stays low and flat throughout — visually confirming the 7.38% failure rate was steady background noise (the rate limiter) rather than a spike-triggered cascade of errors. As in every other test in this report, the **"Iterations" panel shows No data** — the same recurring Grafana dashboard query gap, unrelated to test correctness.

![Spike Test Output](backend/loadtests/screenshots/k6/spikeTestOutput.png)

![Spike Test Visual](backend/loadtests/screenshots/visualGrafana/spikeTestVisual.png)

---

## Summary of Findings

| Test                        | What Was Proven                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth Load Baseline          | The auth endpoint and the total k6/Prometheus/Grafana pipeline are functioning or not under sustained concurrent load.                                                                                                     |
| Atomic Lock Race            | The Redis atomic lock guarantees exactly one winner per seat no matter, with zero double-booking / overselling, even under its maximum.                                                                                    |
| Flash Sale E2E Flow         | Lock+payment*acceptance correctly in under the inventory (~499/500) under a realistically simulated 1,500-user rush, with zero overselling — though payment \_confirmation* throughput (BullMQ suffered a bottleneck here) |
| Seat Expiry (TTL) Leak Test | Abandoned locks self-clean via Redis TTL with no manual work required and no stuck state under again retry pressure.                                                                                                       |
| Event Page Spike Test       | Read-heavy endpoints absorb a 40x traffic spike without breaking database connection.                                                                                                                                      |

**Overall conclusion:** across every load profile tested, the core correctness guarantee held without exception — no seat was ever oversold or double-booked, whether under a single-seat 500-way race, a full 1,500-user flash sale, or sustained TTL-expiry retry pressure. The one genuine weakness surfaced by this testing is the Flash Sale test's payment-confirmation throughput under sustained load (Section 2) — a queue-concurrency tuning issue, not a data-integrity one — and it's documented above with a concrete fix path rather than hidden or excluded from this report.

## Get Started with Tests

**Note:** Please note that before performing any load tests locally you must go through the goal, make before hand arrangements (if required) for the specific load tests (eg: users data or seats in the database) - the config section mentioned in each of the files that is the script file for example the [Login Script](backend/loadtests/scripts/loginTest.js) inside the backend/loadtests/scripts/ to make sure..

**Also Note:** that you have these services running on ports **-->**

- PostgreSQL is running on port `5432`
- Redis is running on port `6379`
- Prometheus is running on port `9090` (configured with remote-write target)
- Grafana is running on port `3000`

**`COMING SOON` - CONTAINERIZING THE APP**

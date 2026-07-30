# Ticket Booking Platform

A high-concurrency event ticketing system built to handle flash-sale traffic like a Coldplay Concert or an IPL final - without ever overselling seats. The platform combines a **virtual waiting room**, **atomic Redis seat locks**, **async payment processing**, and **real-time WebSocket updates** for the seats and the virtual waiting room so thousands of users can compete for limited inventory seats while the system stays consistent.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [System Architecture](#system-architecture)
- [Queueing Strategy](#queueing-strategy)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Redis Key Design](#redis-key-design)
- [API Overiview](#api-overview)
- [Getting Started](#getting-started)
- [Frontend Routes](#frontend-routes)
- [Load Test Overview](#load-testing)
- [License](#license)

- [Getting Started With LoadTests](./backend/loadtests/README.md#get-started-with-tests)

---

## Executive Summary

When ticket demand spikes, most booking systems fail in predictable ways: double bookings, stale seat maps, and login bottlenecks. This project addresses those failure modes with a layered architecture:

| Layer                   | Role                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| **PostgreSQL + Prisma** | Source of truth for users, events, seats, and CONFIRMED bookings           |
| **Redis**               | Hot-path seat locks, seat-map cache, and waiting-room queue state          |
| **Lua scripts**         | Atomic lock acquire/release — no race conditions on contested seats        |
| **BullMQ**              | Async payment jobs so checkout does not block the API under load           |
| **Socket.IO**           | Live queue position, seat status, and booking confirmation to every client |

The result is a booking flow that mirrors how production ticketing platforms behave during a drop: users wait in line, a capped number enter the seat map at once, seats are held with a TTL, and payment is processed in the background with full rollback on failure.

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend (port 4000)                    │
│  Auth · Events · Seat Map · Waiting Room UI · Admin Dashboard           │
│  Socket.IO client (real-time) + Axios (REST) + polling fallback         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Express API (port 5000)                            │
│  Auth · Events · Seats · Bookings · Payments                            │
└───┬─────────────┬──────────────┬──────────────┬─────────────────────────┘
    │             │              │              │
    ▼             ▼              ▼              ▼
 PostgreSQL     Redis         BullMQ        Socket.IO
 (Prisma)    locks · cache   paymentQueue   broadcast rooms
             · waiting queue
             · active users
```

### Booking Flow (Happy Path)

```text
1. User opens event → enters virtual waiting room (if at capacity)
2. Promoted to ACTIVE → seat map served from Redis hash cache
3. User selects seat → POST /lock → Lua script atomically locks seat (TTL)
4. User clicks Pay Now → job enqueued to BullMQ
5. PaymentWorker confirms booking in DB transaction, updates cache, frees slot
6. Socket.IO pushes booking_confirmed + seat_status_changed to all viewers
7. Next user in waiting queue is promoted automatically
```

### Concurrency Safeguards

- **Atomic seat locks** — Redis `SET key userId EX ttl NX` via Lua; only the lock holder can release or pay.
- **No overselling** — DB seat status is checked before lock; payment worker uses Prisma transactions.
- **Virtual waiting room** — Redis sorted set (`waiting_queue`) + active user set capped at `MAX_ACTIVE_USERS`.
- **Cache self-healing** — Seat map endpoint reconciles Redis hash vs. live lock keys and repairs drift in the background.
- **Graceful disconnect** — Socket disconnect removes user from queue/active pool and promotes the next waiter.

---

## Queueing Strategy

TicketBook uses **two separate queues** that solve different problems during a flash sale:

| Queue                    | Technology              | Purpose                                                                                              |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Virtual waiting room** | Redis sorted set + set  | Admission control — caps how many users can view and interact with the seat map at once              |
| **Payment queue**        | BullMQ (`paymentQueue`) | Async payment (mock) — get payment processing from the HTTP request so the API stays fast under load |

Both are for per-event (waiting room) or per-booking (payment), and both push live status to the client over Socket.IO with polling fallbacks.

---

### 1. Virtual Waiting Room (Seat Map Admission)

When a user opens an event page, the first call to `GET /api/events/:eventId/seats` acts as the **entry gate**. The server sees whether the user is **ACTIVE** (can see the seat map) or **WAITING** (held in line).

#### Data structures

```text
waiting_queue:{eventId}   →  Redis Sorted Set   (member = userId, score = join timestamp)
active_users:{eventId}    →  Redis Set          (members currently viewing the seat map)
```

- **FIFO ordering** — users are scored by `Date.now()` on join. `ZRANGE` always returns the earliest joiners first.
- **Idempotent join** — `ZADD NX` ensures a user is only enqueued once, even if they refresh or poll repeatedly.
- **Key expiry** — `waiting_queue:{eventId}` gets a 24-hour TTL (`QUEUE_TTL_SECONDS`) on using first so stale keys do not linger forever.

#### Admission flow

```text
User hits GET /events/:id/seats
        │
        ▼
Already in active_users? ──yes──► Return 200 ACTIVE + seat map
        │
       no
        │
        ▼
ZADD waiting_queue (NX, score = timestamp)
        │
        ▼
Vacancies = MAX_ACTIVE_USERS − scard(active_users)
        │
        ▼
Promote top N users from queue → active_users (remove from queue)
        │
        ▼
User in active_users? ──yes──► Return 200 ACTIVE + seat map
        │
       no
        │
        ▼
Return 202 WAITING + queuePosition (ZRANK + 1)
```

`MAX_ACTIVE_USERS` defaulted to **5** in `backend/src/lib/constants.ts`. Only that many users can hold an active seat-map slot at the same time; everyone else waits in line.

#### When slots open up (promotion triggers)

The helper `promoteQueueAndNotify()` in `queue.service.ts` runs whenever a vacancy appears. It Computes vacancies (`MAX_ACTIVE_USERS − active count`) then Moves the top N waiters from the sorted set into `active_users`. It also Emits `queue_promoted` to each promoted user (using their `user:{userId}` Socket.IO room), emits `queue_update` with new positions to everyone still waiting. We broadcast `queue_moved` to the event queue room for observability

Promotion is triggered when a user **leaves the active pool**, which happens on:

| Event                   | Source                                                    |
| ----------------------- | --------------------------------------------------------- |
| Payment succeeds        | `PaymentWorker` removes user from `active_users`          |
| Payment fails           | `PaymentWorker` rolls back and removes user               |
| User releases seat lock | `seatLockController` (cancel reservation)                 |
| User completes booking  | `booking.service` (direct booking path)                   |
| Socket disconnect       | `socket.ts` — user removed from queue **and** active pool |
| Explicit leave          | `leave_event_queue` Socket event                          |

This keeps the active pool size correctly: a user occupies a slot while seeing the map, locking a seat, and paying — and frees it when they finish, fail, abandon, or disconnect.

#### User identity in the queue

- **Authenticated users** — identified by JWT `userId`
- **Guests** — identified by `x-guest-session-id` header or `guest_session` httpOnly cookie (auto-created on first visit)

Both use the same Redis keys; guests participate in the waiting room without an account.

#### Real-time updates and fallback

| Transport        | When used                                  | Interval                             |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| **Socket.IO**    | Authenticated users with a valid JWT token | Instant                              |
| **HTTP polling** | Guests, or when WebSocket connection fails | Every 5 s (`QUEUE_POLL_INTERVAL_MS`) |

Frontend events handled on `/events/[id]`:

- `queue_update` — position changed while waiting
- `queue_promoted` — user moved to ACTIVE; seat map is fetched immediately
- `queue_moved` — general queue movement broadcast (logging / debugging)

While waiting, the UI shows `MapQueuePanel` with live position; on promotion it swaps to the interactive seat grid.

#### Startup cleanup

On Redis connect, `clearExistingQueues()` scans and deletes all `waiting_queue:*` and `active_users:*` keys. This prevents ghost queue state from surviving a server restart when in-memory Socket connections are already gone.

---

### 2. Payment Queue (BullMQ)

Once a user is **ACTIVE**, locks a seat, and clicks **Pay Now**, he moves to a second queue — this one is for **payment**, not seat-map admission.

#### Flow

```text
POST /api/payment/pay
        │
        ▼
Create PENDING booking in PostgreSQL
        │
        ▼
Enqueue job → BullMQ paymentQueue
        │
        ▼
Return 202 Accepted (API responds immediately)
        │
        ▼
PaymentWorker picks up job (concurrency: 100)
        │
        ├── emit payment_processing  →  user
        ├── simulate gateway delay (2 s)
        ├── Prisma transaction: seat BOOKED, booking CONFIRMED + PAID
        ├── update Redis seat cache, delete seat lock
        ├── remove user from active_users
        ├── promoteQueueAndNotify()  →  next waiter enters seat map
        └── emit booking_confirmed + seat_status_changed
```

On failure, the worker rolls back the booking, releases the seat lock, removes the user from the active pool, promotes the next user, and emits `booking_failed`.

#### Why a separate payment queue?

- The HTTP handler returns in milliseconds (`202 Accepted`) instead of blocking on DB writes and simulated gateway latency.
- BullMQ buffers spikes — during a 2,000-user flash sale, jobs queue safely while workers drain at controlled concurrency.
- Load tests showed payment ingestion p95 around **46 ms** at the API layer while workers processed bookings asynchronously.

The frontend `PaymentQueuePanel` tracks the job lifecycle: **waiting → processing → success / failed**, driven by Socket.IO events with a 2-second booking-status poll as backup.

---

### 3. How the two queues interact

```text
                    ┌─────────────────────────┐
  Thousands of      │  Virtual Waiting Room   │  MAX_ACTIVE_USERS = 5
  concurrent        │  (Redis FIFO queue)     │  at a time on seat map
  visitors  ──────► └───────────┬─────────────┘
                                │ promoted
                                ▼
                    ┌─────────────────────────┐
                    │  Seat map + lock seat   │
                    └───────────┬─────────────┘
                                │ Pay Now
                                ▼
                    ┌─────────────────────────┐
  API stays fast    │  BullMQ paymentQueue    │  Workers confirm in DB
  (202 Accepted)    │  (async payment)        │  and free waiting-room slot
                    └─────────────────────────┘
```

The waiting room protects **read and lock endpoints** from not bounded concurrency. The payment queue protects **write-heavy checkout** from blocking HTTP threads. Together they mirror how production ticketing platforms serialize access during a drop while still processing payments reliably at the back.

---

## Features

### For Customers

- **Account management** — Email/password registration and login with JWT (httpOnly cookie + Bearer token support)
- **Google OAuth** — Sign in with Google; accounts linked by email when applicable
- **Event discovery** — Browse upcoming events with availability, featured a carousel on home
- **Interactive seat map** — 10-column grid with live AVAILABLE / LOCKED / BOOKED states
- **Virtual waiting room** — Queue position with WebSocket updates and polling fallback
- **Timed seat reservation** — Countdown timer while seat is locked; auto-release on timeout and expiry
- **Async checkout** — Payment processed in background with live status (processing → confirmed / failed)
- **My Bookings** — View and filter bookings; cancel confirmed reservations

### For Admins

- **Protected admin dashboard** — Role-gated (`ADMIN`) event management UI
- **Event CRUD** — Create, edit, and delete events with auto-generated seats
- **Seat provisioning** — Seats created in PostgreSQL and pre-warmed into Redis on event creation
- **Client-side search** — Filter events by name or venue in the admin panel

### Real-Time Events (Socket.IO)

| Event                 | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `queue_update`        | Waiting-room position changed                          |
| `queue_promoted`      | User moved from queue to active seat-map access        |
| `seat_status_changed` | Seat locked, released, or booked — updates all viewers |
| `payment_processing`  | Payment job picked up by worker                        |
| `booking_confirmed`   | Ticket confirmed after successful payment              |
| `booking_failed`      | Payment failed; seat released back to pool             |

---

## Tech Stack

| Area               | Technologies                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Socket.IO Client, Axios, Motion, shadcn/ui |
| **Backend**        | Node.js, Express 5, TypeScript, Prisma ORM                                                   |
| **Database**       | PostgreSQL                                                                                   |
| **Cache & Queues** | Redis (ioredis), BullMQ                                                                      |
| **Auth**           | JWT, bcrypt, Passport Google OAuth 2.0                                                       |
| **Real-time**      | Socket.IO                                                                                    |

---

## Project Structure

```text
ticket/
├── backend/
│   ├── loadtests/           # The Scripts, Screenshots and more docs on loadtests
│   ├── prisma/              # Schema, migrations
│   └── src/
│       ├── config/          # Passport (Google OAuth)
│       ├── controllers/     # Request handlers
│       ├── lib/             # Redis, Prisma, BullMQ, Socket.IO, Lua scripts
│       ├── middlewares/     # JWT auth + admin guard
│       ├── routes/          # REST route definitions
│       ├── services/        # Business logic (auth, booking, seat lock, queue, payment worker)
│       └── utils/
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # UI, admin, queue panels
│       ├── context/         # AuthContext
│       ├── lib/             # API client, Socket.IO, types
│       └── middleware/      # AdminProtect
└── README.md
```

---

## Data Model

```text
User ──< Booking >── Seat >── Event
```

| Model       | Key Fields                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| **User**    | `name`, `email`, `passwordHash?`, `googleId?`, `role` (`CUSTOMER` \| `ADMIN`)                          |
| **Event**   | `name`, `venue`, `date`, `totalSeats`, `imageUrl`                                                      |
| **Seat**    | `seatNumber`, `status` (`AVAILABLE` \| `LOCKED` \| `BOOKED`)                                           |
| **Booking** | `status` (`PENDING` \| `CONFIRMED` \| `CANCELLED`), `paymentStatus` (`UNPAID` \| `PAID` \| `REFUNDED`) |

---

## Redis Key Design

| Key Pattern                    | Type         | Purpose                                        |
| ------------------------------ | ------------ | ---------------------------------------------- |
| `seat_lock:{eventId}:{seatId}` | String (TTL) | Holds `userId` of lock owner                   |
| `event_seats:{eventId}`        | Hash         | Cached seat map (`seatId → seatNumber:status`) |
| `waiting_queue:{eventId}`      | Sorted Set   | FIFO queue scored by join timestamp            |
| `active_users:{eventId}`       | Set          | Users currently viewing the seat map           |

Configurable constants live in `backend/src/lib/constants.ts`:

- `LOCK_TTL_SECONDS` — payment window duration (here pay now) for a held seat
- `MAX_ACTIVE_USERS` — concurrent users allowed past the waiting room
- `QUEUE_TTL_SECONDS` — waiting-room key expiry (24 h)

---

## API Overview

### Auth — `/api/auth`

| Method | Endpoint           | Description                           |
| ------ | ------------------ | ------------------------------------- |
| `POST` | `/register`        | Create account                        |
| `POST` | `/login`           | Login, returns JWT                    |
| `GET`  | `/me`              | Current user profile (auth required)  |
| `GET`  | `/google`          | Initiate Google OAuth                 |
| `GET`  | `/google/callback` | OAuth callback → redirect to frontend |

### Events — `/api/events`

| Method   | Endpoint          | Auth     | Description                                                      |
| -------- | ----------------- | -------- | ---------------------------------------------------------------- |
| `GET`    | `/`               | Public   | List all events with availability                                |
| `GET`    | `/:eventId`       | Public   | Single event details                                             |
| `GET`    | `/:eventId/seats` | Optional | Seat map or waiting-room response (`202 WAITING` / `200 ACTIVE`) |
| `POST`   | `/`               | Admin    | Create event + seats                                             |
| `PUT`    | `/:eventId`       | Admin    | Update event (Update seats with constraints)                     |
| `DELETE` | `/:eventId`       | Admin    | Delete event + seats (With constraints)                          |

### Seats — `/api/seats`

| Method   | Endpoint                 | Auth | Description                      |
| -------- | ------------------------ | ---- | -------------------------------- |
| `POST`   | `/:eventId/:seatId/lock` | User | Atomically Reserve (lock) a seat |
| `DELETE` | `/:eventId/:seatId/lock` | User | Cancel Reservation               |

### Payment — `/api/payment`

| Method | Endpoint | Auth | Description                                                                  |
| ------ | -------- | ---- | ---------------------------------------------------------------------------- |
| `POST` | `/pay`   | User | Create booking with PENDING payment and Enqueue payment job (`202 Accepted`) |

### Bookings — `/api/bookings`

| Method   | Endpoint | Auth | Description          |
| -------- | -------- | ---- | -------------------- |
| `GET`    | `/my`    | User | List user's bookings |
| `GET`    | `/:id`   | User | Get Single booking   |
| `DELETE` | `/:id`   | User | Cancel booking       |

### Health

| Method | Endpoint  | Description                    |
| ------ | --------- | ------------------------------ |
| `GET`  | `/health` | API + Redis connectivity check |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Docker and Docker Compose (for services)
- K6 CLI (for Load Testing)

### 1. Clone and install

```bash
git clone https://github.com/Darshik924/ticketBook
cd ticketBook

cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend environment

Navigate into the server's core directory and copy the sample credentials provided as a blueprint to initialize your local variables. You can modify them if you wish to use a service outside of the Docker container, or a different Docker container.

```bash
cd backend
cp .env.example .env
```

Open the generated `.env` file and customize your target secrets if necessary.

---

### 3. Database setup

```bash
cd backend
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

### 4. Run the backend

```bash
cd backend
npm run dev
# → http://localhost:5000
```

### 5. Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 6. Run the frontend

```bash
cd frontend
npm run dev
# → http://localhost:4000
```

### 7. Create an admin user

Register a user via the UI, then promote them in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

In order to Get started with Load Testing locally -
[View Documentation](backend/loadtests/README.md#get-started-with-tests)

---

## Frontend Routes

| Route                 | Description                                    |
| --------------------- | ---------------------------------------------- |
| `/`                   | Redirects to `/events` or `/login`             |
| `/login`, `/register` | Authentication                                 |
| `/home`               | Featured events carousel                       |
| `/events`             | All upcoming events                            |
| `/events/[id]`        | Event detail, waiting room, seat map, checkout |
| `/bookings`           | User's ticket history                          |
| `/admin`              | Admin event management (ADMIN only)            |
| `/auth/callback`      | Google OAuth token handoff                     |

---

## Design Decisions Worth Highlighting

1. **Redis-first seat map reads** — Under load, the seat map is served from an in-memory Redis hash cache rather than hitting PostgreSQL on every poll. PostgreSQL remains authoritative for CONFIRMED bookings.

2. **Lua over application-level locking** — Lock acquire and release are single round-trip atomic operations, eliminating check-then-set races that cause double bookings.

3. **Waiting room as admission control** — Capping active users (`MAX_ACTIVE_USERS`) prevents the seat map and lock endpoints from being hammered by unbounded concurrent traffic during a flash sale.

4. **BullMQ decouples payment from HTTP** — The API returns `202 Accepted` immediately; a background worker simulates gateway latency, runs the DB transaction, and broadcasts results over WebSockets (to both the user booking and to the seat map that someone has booked).

5. **Dual transport for queue updates** — Authenticated users get live Socket.IO updates; guests and fallback clients poll every 5 seconds.

6. **Startup queue cleanup** — On Redis connect, stale `waiting_queue:*` and `active_users:*` keys are scanned and cleared to avoid ghost queue state after server restarts.

---

## Load Testing

TicketBook was built by the assumption that seats will be contested with proof — not just booked. To validate, the booking pipeline (Redis atomic locks → BullMQ payment queue → Postgres) was stress-tested with [k6](https://k6.io/), with all metrics streamed live to Prometheus and visualized in Grafana.

### Global Summary Matrix

| Test                               | Target VUs | Peak RPS    | Success Rate                            | p(95) Latency | Overselling?      |
| ---------------------------------- | ---------- | ----------- | --------------------------------------- | ------------- | ----------------- |
| **1. Atomic Lock Race**            | 500        | 18.4 req/s  | 100% (500/500 valid outcomes)           | 417.06ms      | **Strictly Zero** |
| **2. Flash Sale E2E Flow**         | 2000       | 2.43K req/s | 100% 500/500 confirmed in-window        | 498.61ms      | **Strictly Zero** |
| **3. Seat Expiry (TTL) Leak Test** | 100        | 75.0 req/s  | 100% (100/100 seats recovered post-TTL) | 177.51ms      | **Strictly Zero** |
| **4. Event Page Spike Test**       | 2,000      | 2.52K req/s | 100% (0 server errors)                  | 274.81ms      | N/A               |

> All four tests are run with `per-vu-iterations` or `ramping-vus` executors against a locally set dataset (see configs at the top of every load test script), with real-time metrics pushed to Prometheus using the k6's remote-write output.
>
> **Note on the "Success Rate":** for the Atomic Lock Race test, this means "% of requests that returned a valid, expected outcome (200 or 409)" — not "% of users who got the seat." Since the setup was made so that all 500 bots would target the EXACT same seat, exactly 1 of 500 requests acquires the lock by design which is expected since we want only ONE user to book seat even if 500 users target the same seat; the other 499 correctly receiving `409 Conflict` is the accurate condition, not a failure.

**What this proves, in one line:** under every load profile tested — a single-seat race, a full 2,000-user flash sale scene, an abandoned-seat-lock cycle, and a 2,000-VU traffic spike — the system never allowed a seat to be booked by more than one user, and read-heavy (events) endpoints held up without breaking any connection to Postgres.

### Read the Full Concurrency & Load Test Report (with Grafana Dashboards) [HERE](./backend/loadtests/README.md)

The full report includes the detailed test objectives, k6 script logic, raw CLI output for every run, and embedded Grafana dashboard screenshots (RPS curves, VU ramp profiles, and latency trends) for each of the four tests above.

---

## License

ISC

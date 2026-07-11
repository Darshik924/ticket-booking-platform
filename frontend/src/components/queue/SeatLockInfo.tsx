"use client";

import { useEffect, useState } from "react";
import { seatType } from "@/lib/types";

interface Props {
  seat: seatType | null;
  lockExpiresIn: number | null;
  onPayNow: () => void;
  onCancel: () => void;
  onTimeOut: () => void;
}

const SeatLockInfo = ({
  seat,
  lockExpiresIn,
  onPayNow,
  onCancel,
  onTimeOut,
}: Props) => {
  const [remaining, setRemaining] = useState(lockExpiresIn ?? 0);

  useEffect(() => {
    setRemaining(lockExpiresIn ?? 0);
  }, [lockExpiresIn]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remaining]);

  if (!seat) return null;

  const isExpired = remaining <= 0;
  const isLastTenSeconds = remaining > 0 && remaining <= 10;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  if (isExpired) {
    return (
      <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-destructive">
              Reservation expired
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {seat.seatNumber}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Your time to complete payment has run out and this seat has been
              released back to the seat map. Please select a seat again.
            </p>
          </div>

          <div className="rounded-3xl bg-background p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Time left to pay
            </p>
            <p className="mt-2 text-3xl font-bold text-destructive">0:00</p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onTimeOut}
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground shadow-sm transition duration-200 hover:bg-destructive/90"
          >
            Back to Seat Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/10 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Seat reserved</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {seat.seatNumber}
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your seat is temporarily locked while you complete payment. Click
            Pay Now to enter the payment queue.
          </p>
        </div>

        <div
          className={`rounded-3xl bg-background p-4 shadow-sm transition-colors ${
            isLastTenSeconds ? "ring-2 ring-destructive/50" : ""
          }`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Time left to pay
          </p>
          <p
            className={`mt-2 text-3xl font-bold transition-colors ${
              isLastTenSeconds
                ? "text-destructive animate-pulse"
                : "text-primary"
            }`}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onPayNow}
          className="inline-flex items-center cursor-pointer hover:text-blue-900 hover:bg-cyan-300 duration-300 justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition"
        >
          Pay Now
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center hover:text_blue-950 cursor-pointer duration-200 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
        >
          Cancel Reservation
        </button>
      </div>
    </div>
  );
};

export default SeatLockInfo;

"use client";

import { useEffect, useState } from "react";
import { seatType } from "@/lib/types";

interface Props {
  seat: seatType | null;
  lockExpiresIn: number | null;
  onPayNow: () => void;
  onCancel: () => void;
}

const SeatLockInfo = ({ seat, lockExpiresIn, onPayNow, onCancel }: Props) => {
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

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Seat reserved</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {seat.seatNumber}
          </p>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Your seat is temporarily locked while you complete payment. Click
            Pay Now to enter the payment queue.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-inner shadow-blue-100">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Time left to pay
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onPayNow}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Pay Now
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel Reservation
        </button>
      </div>
    </div>
  );
};

export default SeatLockInfo;

"use client";

import { seatType } from "@/lib/types";

interface QueueState {
  status: "idle" | "waiting" | "processing" | "success" | "failed";
  message: string;
  position: number | null;
}

interface Props {
  seat: seatType | null;
  queueState: QueueState;
  onCancel: () => void;
}

const PaymentQueuePanel = ({ seat, queueState, onCancel }: Props) => {
  if (!seat) return null;

  const statusClasses = {
    idle: "text-slate-600 bg-slate-100",
    waiting: "text-amber-800 bg-amber-100",
    processing: "text-blue-800 bg-blue-100",
    success: "text-emerald-800 bg-emerald-100",
    failed: "text-red-800 bg-red-100",
  };

const statusLabels = {
  idle: "Waiting to start",
  waiting: "In queue",
  processing: "Processing payment",
  success: "Confirmed",
  failed: "Payment failed",
};

const statusDescriptions = {
  idle: "Your payment has not started yet.",
  waiting: "Your request is in the queue. Please stay on this page for real-time updates.",
  processing: "Your payment is being processed. This may take a few moments.",
  success: "Your booking is confirmed. Thank you!",
  failed: "There was a payment issue. You can retry or choose a different seat.",
};

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Payment queue</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {seat.seatNumber}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {statusLabels[queueState.status]}
          </p>
        </div>

        <div
          className={`rounded-full px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 shadow-sm ${statusClasses[queueState.status]}`}
        >
          <span>{queueState.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Queue position
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {queueState.position ?? "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Stage
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {statusLabels[queueState.status]}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Latest update
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {queueState.message || statusDescriptions[queueState.status]}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Summary
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {statusDescriptions[queueState.status]}
        </p>
        {/* </button> */}
      </div>
    </div>
  );
};

export default PaymentQueuePanel;

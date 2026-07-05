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
    idle: "bg-muted text-muted-foreground",
    waiting: "bg-warning/15 text-warning",
    processing: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    failed: "bg-destructive/10 text-destructive",
  };

  const statusIcons = {
    idle: "⏸️",
    waiting: "⏳",
    processing: "⚡",
    success: "✅",
    failed: "⚠️",
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
    waiting:
      "Your request is in the queue. Please stay on this page for real-time updates.",
    processing: "Your payment is being processed. This may take a few moments.",
    success: "Your booking is confirmed. Thank you!",
    failed:
      "There was a payment issue. You can retry or choose a different seat.",
  };

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-lg shadow-zinc-900/5">
      <div className="flex flex-col gap-5 rounded-3xl bg-background/80 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Payment queue
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {seat.seatNumber}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusLabels[queueState.status]}
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${statusClasses[queueState.status]}`}
        >
          <span>{statusIcons[queueState.status]}</span>
          <span>{queueState.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border bg-muted p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Queue position
          </p>
          <p className="mt-2 text-4xl font-bold text-foreground">
            {queueState.position ?? "—"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your current spot
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-muted p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Stage
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {statusLabels[queueState.status]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Where your payment is now
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-muted p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Latest update
          </p>
          <p className="mt-2 min-h-12 text-sm font-medium text-foreground">
            {queueState.message || statusDescriptions[queueState.status]}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-muted p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {statusIcons[queueState.status]}
          </span>
          <span>Quick summary</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {statusDescriptions[queueState.status]}
        </p>
      </div>
    </div>
  );
};

export default PaymentQueuePanel;

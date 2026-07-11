"use client";

import { motion } from "motion/react";
import { seatType } from "@/lib/types";

interface QueueState {
  status: "idle" | "waiting" | "processing" | "success" | "failed";
  message: string;
}

interface Props {
  seat: seatType | null;
  queueState: QueueState;
  onCancel: () => void;
}

const STEPS = ["waiting", "processing", "success"] as const;

// Animated Check Icon for the Success state
const AnimatedCheck = () => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
    <motion.path
      d="M8 12.5l3 3 5-6"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
    />
  </motion.svg>
);

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
    success: <AnimatedCheck />,
    failed: "⚠️",
  };

  const statusLabels = {
    idle: "Waiting to start",
    waiting: "Request received",
    processing: "Processing payment",
    success: "Confirmed",
    failed: "Payment failed",
  };

  const statusDescriptions = {
    idle: "Your payment has not started yet.",
    waiting: "Your request has been accepted and is about to be processed.",
    processing: "Your payment is being processed. This may take a few moments.",
    success: "Your booking is confirmed. Thank you!",
    failed:
      "There was a payment issue. You can retry or choose a different seat.",
  };

  const isFailed = queueState.status === "failed";
  const currentStepIndex = isFailed
    ? -1
    : STEPS.indexOf(queueState.status as (typeof STEPS)[number]);

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-gray-200 p-6 shadow-lg shadow-zinc-900/5">
      <div className="flex flex-col gap-5 rounded-3xl bg-background/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Payment status
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            Seat {seat.seatNumber}
          </p>
        </div>

        <motion.div
          layout
          className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors sm:self-auto ${statusClasses[queueState.status]}`}
        >
          <span className="flex items-center justify-center">
            {statusIcons[queueState.status]}
          </span>
          <span>{statusLabels[queueState.status]}</span>
        </motion.div>
      </div>

      <div className="mt-8 flex items-center px-2">
        {STEPS.map((step, index) => {
          const isComplete =
            !isFailed &&
            (index < currentStepIndex || queueState.status === "success");
          const isCurrent = !isFailed && index === currentStepIndex;
          const isLast = index === STEPS.length - 1;

          const circleClasses = isFailed
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : isComplete
              ? "border-success bg-success text-success-foreground"
              : isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground";

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={
                    isCurrent || isComplete
                      ? { scale: [1, 1.2, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.4 }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${circleClasses}`}
                >
                  {isFailed && step === "waiting" ? "!" : index + 1}
                </motion.div>
                <span className="text-xs font-medium capitalize text-muted-foreground">
                  {step}
                </span>
              </div>

              {!isLast && (
                <div className="mx-2 h-1 flex-1 overflow-hidden rounded bg-border">
                  <motion.div
                    className="h-full origin-left bg-success"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: !isFailed && index < currentStepIndex ? 1 : 0,
                    }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-muted p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {statusIcons[queueState.status]}
          </span>
          <span>Latest update</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {queueState.message || statusDescriptions[queueState.status]}
        </p>
      </div>

      {(queueState.status === "idle" || queueState.status === "waiting") && (
        <button
          onClick={onCancel}
          className="mt-6 w-full rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default PaymentQueuePanel;

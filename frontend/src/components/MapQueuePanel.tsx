"use client";

interface MapQueuePanelProps {
  queuePosition: number | null;
  message: string;
  connectionType: "websocket" | "polling" | "none";
}

const MapQueuePanel = ({ queuePosition, message, connectionType }: MapQueuePanelProps) => {
  const getStatusTextAndColor = () => {
    switch (connectionType) {
      case "websocket":
        return {
          text: "Live Updates",
          dotClass: "bg-emerald-500 animate-pulse",
          bgClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
        };
      case "polling":
        return {
          text: "Auto-Refresh Active",
          dotClass: "bg-amber-500 animate-pulse",
          bgClass: "bg-amber-50 border-amber-200 text-amber-700",
        };
      default:
        return {
          text: "Connecting...",
          dotClass: "bg-slate-400 animate-ping",
          bgClass: "bg-slate-50 border-slate-200 text-slate-600",
        };
    }
  };

  const status = getStatusTextAndColor();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-8 shadow-md">
      {/* Background Decorative Gradient Radial */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center text-center">
        {/* Status indicator pill */}
        <div className={`mb-6 flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold ${status.bgClass} shadow-xs`}>
          <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`}></span>
          <span>{status.text}</span>
        </div>

        {/* Animated Radar/Waves for Waiting Feedback */}
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <div className="absolute h-full w-full rounded-full bg-blue-100/40 animate-ping opacity-75"></div>
          <div className="absolute h-20 w-20 rounded-full bg-blue-200/50 animate-pulse"></div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-500/20 text-white">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>

        {/* Queue Position Display */}
        <h3 className="text-xl font-bold text-slate-800">Busy Event Traffic</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          The event is experiencing extremely high demand. You have been placed in the waiting queue to view the seat map.
        </p>

        <div className="mt-6 w-full max-w-sm rounded-xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Queue Position
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600">
            #{queuePosition ?? "—"}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            You will automatically enter the seat map when a vacancy opens.
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="mt-6 max-w-md rounded-lg bg-blue-50/50 border border-blue-100/50 px-4 py-2.5 text-xs font-medium text-blue-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapQueuePanel;

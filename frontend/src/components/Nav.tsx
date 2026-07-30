"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE } from "../context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const Nav = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/events") {
      return pathname === "/events" || pathname.startsWith("/events/");
    }
    return pathname === href;
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <Link href="/events" className="text-lg font-semibold text-white">
          TicketBook
        </Link>

        <div className="flex items-center gap-4">
          {user?.role === ROLE.ADMIN && (
            <Link
              href="/admin"
              className={`rounded-3xl border px-4 py-2 text-sm font-semibold transition ${
                isActive("/admin")
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/30"
                  : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-white/10 hover:bg-gray-400 hover:text-black"
              }`}
            >
              EditEvents
            </Link>
          )}

          <Link
            href="/home"
            className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/home")
                ? "text-blue-500 shadow-lg shadow-blue-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Home
          </Link>

          <Link
            href="/events"
            className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/events")
                ? "text-blue-500 shadow-lg shadow-blue-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Events
          </Link>
          <Link
            href="/bookings"
            className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/bookings")
                ? "text-blue-500 shadow-lg shadow-blue-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            My Bookings
          </Link>
          <span className="px-2 py-2 text-sm font-light text-zinc-400/70">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="cursor-pointer rounded-3xl px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-600 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Nav;

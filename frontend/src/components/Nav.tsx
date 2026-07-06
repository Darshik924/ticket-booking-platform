"use client";

import Link from "next/link";
import { ROLE } from "../context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const Nav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <Link href="/events" className="text-lg font-semibold text-white">
          TicketBook
        </Link>

        <div className="flex items-center gap-4">
          {user?.role === ROLE.ADMIN && (
            <Link
              href="/admin"
              className="rounded-3xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-lg font-semibold text-zinc-200 transition hover:border-white/10 hover:text-white"
            >
              EditEvents
            </Link>
          )}

          <Link
            href="/events"
            className="rounded-3xl px-4 py-2 text-lg font-semibold text-zinc-400 transition hover:text-white"
          >
            Events
          </Link>
          <Link
            href="/bookings"
            className="rounded-3xl px-4 py-2 text-lg font-semibold text-zinc-400 transition hover:text-white"
          >
            My Bookings
          </Link>
          <span className="px-2 py-2 text-lg font-light text-zinc-400/70">{user?.name}</span>
          <button
            onClick={logout}
            className="rounded-3xl px-4 py-2 text-lg font-semibold text-red-400 transition hover:text-white cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Nav;

"use client";

import Link from "next/link";
import { ROLE } from "../context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const Nav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
      <Link href="/events" className="font-semibold text-lg text-gray-900">
        TicketBook
      </Link>

      <div className="flex items-center gap-4">
        {user?.role === ROLE.ADMIN && (
          <Link
            href="/admin"
            className="text-sm text-green-600 hover:text-green-900"
          >
            EditEvents
          </Link>
        )}

        <Link
          href="/events"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Events
        </Link>
        <Link
          href="/bookings"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          My Bookings
        </Link>
        <span className="text-sm text-gray-500">{user?.name}</span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Nav;

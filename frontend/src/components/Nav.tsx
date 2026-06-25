"use client";

import Link from "next/link";
import { ROLE } from "../context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const Nav = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-amber-50 px-6 py-4 flex items-center justify-between">
      <Link href="/events" className="font-semibold border-white border-2  text-lg text-gray-900">
        TicketBook
      </Link>

      <div className="flex items-center gap-5">
        {user?.role === ROLE.ADMIN && (
          <Link
            href="/admin"
            className="text-lg p-2 border-white hover:bg-green-600 border-2 hover:text-white text-green-600 rounded-3xl duration-150"
          >
            EditEvents
          </Link>
        )}

        <Link
          href="/events"
          className="text-lg p-2 border-white hover:bg-gray-600 border-2 text-gray-600 hover:text-white rounded-3xl duration-150"
        >
          Events
        </Link>
        <Link
          href="/bookings"
          className="text-lg p-2 border-white hover:bg-gray-600 border-2 text-gray-600 hover:text-white rounded-3xl duration-150"
        >
          My Bookings
        </Link>
        <span className="text-lg p-2 text-gray-500">{user?.name}</span>
        <button
          onClick={logout}
          className="text-lg p-2 border-white border-2 cursor-pointer text-red-600 duration-100 rounded-3xl hover:text-white hover:bg-red-700 font-medium"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Nav;

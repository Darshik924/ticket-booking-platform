
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function Callback() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");

    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(JSON.parse(decodeURIComponent(user)))
      );

      router.push("/events");
    }
  }, [params, router]);

  return <div>Signing in...</div>;
}
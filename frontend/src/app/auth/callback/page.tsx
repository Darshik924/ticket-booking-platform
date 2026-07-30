
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CallbackContent() {
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

export default function Callback() {
  return (
    <Suspense fallback={<div>Signing in...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrackOrderPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders?active=true");
  }, [router]);

  return null;
}

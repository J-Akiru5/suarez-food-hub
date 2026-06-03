"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TrackOrderPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders?active=true");
  }, [router]);

  return null;
}

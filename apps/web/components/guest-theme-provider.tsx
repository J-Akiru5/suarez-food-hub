"use client";

import { useEffect } from "react";
import { useAuth } from "./auth-provider";

export function GuestThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (loading) {
      root.classList.add("guest-mode");
      return;
    }
    if (user) {
      root.classList.remove("guest-mode");
    } else {
      root.classList.add("guest-mode");
    }
  }, [user, loading]);

  return <>{children}</>;
}

"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface FooterProps {
  className?: string;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(({ className }, ref) => {
  return (
    <footer ref={ref} className={cn("bg-white border-t border-[#B85C38]/10 py-8", className)}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <a href="/" className="flex-shrink-0 inline-flex items-center gap-3 no-underline">
            <img src="/logo.svg" alt="Suarez Food Hub" className="w-7 h-7" />
            <span className="text-xl font-bold" style={{ fontFamily: "var(--playfair-display)" }}>
              <span className="text-[#B85C38]">Suarez</span> <span className="text-[#1A1A1A]">Food Hub</span>
            </span>
          </a>

          {/* Copyright */}
          <div className="text-xs text-[#1A1A1A]/40">&copy; {new Date().getFullYear()} Suarez Food Hub</div>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export { Footer };

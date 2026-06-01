"use client";

import * as React from "react";
import { Utensils } from "lucide-react";
import { cn } from "../lib/utils";

export interface FooterProps {
  className?: string;
}

const navLinks = [
  { label: "Menu", href: "/menu" },
  { label: "Food", href: "/menu" },
  { label: "Services", href: "/how-to-order" },
  { label: "About Us", href: "/about" },
];

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          "bg-white border-t border-[#B85C38]/10 py-8",
          className
        )}
      >
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <span
                className="text-xl font-bold inline-flex items-center gap-2"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                <Utensils className="w-5 h-5 text-[#B85C38]" />
                <span className="text-[#B85C38]">Suarez</span>{" "}
                <span className="text-[#1A1A1A]">Food Hub</span>
              </span>
            </a>

            {/* Nav Links */}
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-[#1A1A1A]/50 hover:text-[#B85C38] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <div className="text-xs text-[#1A1A1A]/40">
              &copy; {new Date().getFullYear()} Suarez Food Hub
            </div>
          </div>
        </div>
      </footer>
    );
  }
);
Footer.displayName = "Footer";

export { Footer };

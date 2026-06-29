"use client";

import { Globe, MapPin, Phone } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

export interface FooterProps {
  className?: string;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(({ className }, ref) => {
  return (
    <footer ref={ref} className={cn("bg-gray-50 border-t py-12", className)} style={{ borderColor: "color-mix(in srgb, var(--primary-color) 10%, transparent)" }}>
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: "var(--primary-color)" }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">
                Suarez Food Hub
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Authentic Filipino food delivered to your doorstep in Janiuay,
              Iloilo.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/menu" className="text-sm text-gray-500 hover:text-gray-900">
                  Menu
                </a>
              </li>
              <li>
                <a href="/about" className="text-sm text-gray-500 hover:text-gray-900">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-sm text-gray-500 hover:text-gray-900">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Hours</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>Monday - Saturday</li>
              <li>10:00 AM - 9:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                +63 912 345 6789
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Janiuay, Iloilo
              </li>
            </ul>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:text-white transition-colors"
                style={{ ["--hover-bg" as any]: "var(--primary-color)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-color)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <Globe className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:text-white transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-color)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Suarez Food Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export { Footer };

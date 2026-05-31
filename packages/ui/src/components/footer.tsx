"use client";

import * as React from "react";
import { Facebook, Instagram, Twitter } from "lucide-react";
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

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
];

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          "bg-white border-t border-gray-100 py-8",
          className
        )}
      >
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                <span className="text-[#b1454a]">SUAREZ</span>{" "}
                <span className="text-gray-900">Food Hub</span>
              </span>
            </a>

            {/* Nav Links */}
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-gray-500 hover:text-[#b1454a] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-[#121212] hover:text-white transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Suarez Food Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }
);
Footer.displayName = "Footer";

export { Footer };

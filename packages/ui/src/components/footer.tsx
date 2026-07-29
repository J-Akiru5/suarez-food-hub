"use client";

import { Mail, MapPin, Phone, Store } from "lucide-react";
import * as React from "react";

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  /** Operating hours string, e.g. "Mon-Sat 10AM-9PM" — displayed as-is */
  hours?: string;
}

export interface FooterProps {
  className?: string;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(({ className }, ref) => {
  const [info, setInfo] = React.useState<BusinessInfo | null>(null);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setInfo({
            name: res.data.name || "Suarez Food Hub",
            address: res.data.address || "Janiuay, Iloilo",
            phone: res.data.phone || "+63 912 345 6789",
            email: res.data.email || "info@suarezfoodhub.com",
            hours: res.data.operating_hours || undefined,
          });
        }
      })
      .catch(() => {
        // Fallback — keep static defaults
        setInfo({
          name: "Suarez Food Hub",
          address: "Janiuay, Iloilo",
          phone: "+63 912 345 6789",
          email: "info@suarezfoodhub.com",
        });
      });
  }, []);

  const storeName = info?.name || "Suarez Food Hub";
  const storeAddress = info?.address || "Janiuay, Iloilo";
  const storePhone = info?.phone || "+63 912 345 6789";
  const storeEmail = info?.email || "info@suarezfoodhub.com";

  return (
    <footer ref={ref} className="bg-near-black text-white/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-8 md:gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Store size={18} className="text-brand-400" />
              <h3 className="text-lg font-bold text-white font-heading">{storeName}</h3>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Authentic Filipino food delivered to your doorstep. Made with passion, served with love.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="/menu" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                  Menu
                </a>
              </li>
              <li>
                <a href="/about" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                  Contact
                </a>
              </li>
              <li>
                <a href="/how-to-order" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                  How to Order
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Hours</h4>
            {info?.hours ? (
              <p className="text-sm text-white/60">{info.hours}</p>
            ) : (
              <ul className="space-y-2 text-sm text-white/60">
                <li>Monday — Saturday</li>
                <li className="font-medium text-white/80">10:00 AM — 9:00 PM</li>
                <li className="pt-2">Sunday</li>
                <li className="font-medium text-white/50">Closed</li>
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-white/60">
                <Phone size={14} className="shrink-0" />
                {storePhone}
              </li>
              <li className="flex items-center gap-2.5 text-white/60">
                <MapPin size={14} className="shrink-0" />
                {storeAddress}
              </li>
              <li className="flex items-center gap-2.5 text-white/60">
                <Mail size={14} className="shrink-0" />
                {storeEmail}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export { Footer };

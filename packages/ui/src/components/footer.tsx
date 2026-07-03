import { Mail, MapPin, Phone } from "lucide-react";
import * as React from "react";

export interface FooterProps {
  className?: string;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(({ className }, ref) => {
  return (
    <footer ref={ref} className="bg-near-black text-white/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-8 md:gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold text-white font-heading mb-3">Suarez Food Hub</h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Authentic Filipino food delivered to your doorstep in Janiuay, Iloilo. Made with passion, served with
              love.
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
                <a
                  href="/how-to-order"
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  How to Order
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Hours</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>Monday — Saturday</li>
              <li className="font-medium text-white/80">10:00 AM — 9:00 PM</li>
              <li className="pt-2">Sunday</li>
              <li className="font-medium text-white/50">Closed</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-white/60">
                <Phone size={14} className="shrink-0" />
                +63 912 345 6789
              </li>
              <li className="flex items-center gap-2.5 text-white/60">
                <MapPin size={14} className="shrink-0" />
                Janiuay, Iloilo
              </li>
              <li className="flex items-center gap-2.5 text-white/60">
                <Mail size={14} className="shrink-0" />
                info@suarezfoodhub.com
              </li>
            </ul>

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} Suarez Food Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

export { Footer };

"use client";

import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "../lib/utils";

export interface ToastNotificationProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

const ToastNotification = React.forwardRef<HTMLDivElement, ToastNotificationProps>(
  ({ message, isVisible, onClose, className }, ref) => {
    React.useEffect(() => {
      if (isVisible && onClose) {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
      }
    }, [isVisible, onClose]);

    return (
      <div
        ref={ref}
        className={cn(
          "fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-white/90 backdrop-blur-md rounded-30 px-5 py-3.5 shadow-xl border border-white/40 transition-all duration-300",
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0 pointer-events-none",
          className
        )}
      >
        {/* Icon Circle */}
        <div className="w-10 h-10 rounded-full bg-[#b1454a]/10 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-5 h-5 text-[#b1454a]" />
        </div>

        {/* Message */}
        <p className="text-sm font-medium text-gray-800 pr-2">
          {message}
        </p>
      </div>
    );
  }
);
ToastNotification.displayName = "ToastNotification";

export { ToastNotification };

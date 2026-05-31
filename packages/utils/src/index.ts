import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  }

  return formatDate(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getOrderStatusConfig(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  const configs: Record<string, { label: string; color: string; icon: string }> = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800",
      icon: "clock",
    },
    confirmed: {
      label: "Confirmed",
      color: "bg-blue-100 text-blue-800",
      icon: "check",
    },
    preparing: {
      label: "Preparing",
      color: "bg-orange-100 text-orange-800",
      icon: "chef-hat",
    },
    out_for_delivery: {
      label: "Out for Delivery",
      color: "bg-indigo-100 text-indigo-800",
      icon: "truck",
    },
    delivered: {
      label: "Delivered",
      color: "bg-green-100 text-green-800",
      icon: "check-circle",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800",
      icon: "x-circle",
    },
  };

  return configs[status] || configs.pending;
}

export function validateGCashReference(ref: string): boolean {
  const gcashPattern = /^[0-9]{13}$/;
  return gcashPattern.test(ref);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SFH-${year}${month}${day}-${random}`;
}

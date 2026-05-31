"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "../lib/utils";

export interface ProductCardProps {
  name: string;
  price: number;
  priceRange?: string;
  image: string;
  category: string;
  rating: number;
  availability: "available" | "sold_out";
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  (
    {
      name,
      price,
      priceRange,
      image,
      category,
      rating,
      availability,
      featured,
      onClick,
      className,
    },
    ref
  ) => {
    const isSoldOut = availability === "sold_out";

    return (
      <div
        ref={ref}
        onClick={!isSoldOut ? onClick : undefined}
        className={cn(
          "group relative bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden transition-all duration-300",
          !isSoldOut &&
            "cursor-pointer hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl",
          featured && "bento-featured col-span-2",
          className
        )}
      >
        {/* Image Section */}
        <div className="relative h-[200px] overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-md">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-gray-800">
              {rating.toFixed(1)}
            </span>
          </div>

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <span className="bg-gray-800/80 text-white text-sm font-semibold px-4 py-2 rounded-full">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
            {category}
          </p>
          <h3
            className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            {name}
          </h3>
          <p className="text-[#b1454a] font-bold text-base mb-4">
            {priceRange || `₱${price.toFixed(2)}`}
          </p>

          <button
            disabled={isSoldOut}
            className={cn(
              "w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
              isSoldOut
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#b1454a] text-white hover:bg-[#9a3a3f] active:scale-95"
            )}
          >
            {isSoldOut ? "Unavailable" : "Select"}
          </button>
        </div>
      </div>
    );
  }
);
ProductCard.displayName = "ProductCard";

export { ProductCard };

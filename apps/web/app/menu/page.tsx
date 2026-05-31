"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Navbar,
  Footer,
  CategoryFilter,
  ProductCard,
} from "@repo/ui";

const categories = [
  "All",
  "Dimsum",
  "Main Dishes",
  "Noodles",
  "Rice",
  "Appetizers",
  "Desserts",
  "Drinks",
];

const products = [
  {
    name: "Steamed Siomai",
    price: 49,
    image: "/assets/steamed-siomai.jpg",
    category: "Dimsum",
    rating: 4.8,
    availability: "available" as const,
  },
  {
    name: "Fried Siomai",
    price: 55,
    image: "/assets/fried-siomai.jpg",
    category: "Dimsum",
    rating: 4.7,
    availability: "available" as const,
  },
  {
    name: "Pork Lumpia",
    price: 65,
    image: "/assets/pork-lumpia.jpg",
    category: "Appetizers",
    rating: 4.6,
    availability: "available" as const,
  },
  {
    name: "Dynamite Lumpia",
    price: 70,
    image: "/assets/dynamite-lumpia.jpg",
    category: "Appetizers",
    rating: 4.9,
    availability: "available" as const,
  },
  {
    name: "Chicken Adobo",
    price: 150,
    image: "/assets/uploads/chickenadobo.jpg",
    category: "Main Dishes",
    rating: 4.8,
    availability: "available" as const,
  },
  {
    name: "Kare-Kare",
    price: 250,
    image: "/assets/uploads/beefcalderita.jpg",
    category: "Main Dishes",
    rating: 4.9,
    availability: "available" as const,
  },
  {
    name: "Pancit Canton",
    price: 120,
    image: "/assets/uploads/canton.jpg",
    category: "Noodles",
    rating: 4.5,
    availability: "available" as const,
  },
  {
    name: "Pancit Bihon",
    price: 110,
    image: "/assets/uploads/bihon.jpg",
    category: "Noodles",
    rating: 4.4,
    availability: "available" as const,
  },
  {
    name: "Garlic Rice",
    price: 35,
    image: "/assets/uploads/666.jpg",
    category: "Rice",
    rating: 4.3,
    availability: "available" as const,
  },
  {
    name: "Chicken Curry",
    price: 160,
    image: "/assets/uploads/chickencurry.jpg",
    category: "Main Dishes",
    rating: 4.7,
    availability: "available" as const,
  },
  {
    name: "Chopsuey",
    price: 130,
    image: "/assets/uploads/chopsuey.jpg",
    category: "Main Dishes",
    rating: 4.5,
    availability: "available" as const,
  },
  {
    name: "Beef Steak",
    price: 180,
    image: "/assets/uploads/beefsteak.jpg",
    category: "Main Dishes",
    rating: 4.8,
    availability: "available" as const,
  },
  {
    name: "Graham Bar",
    price: 55,
    image: "/assets/uploads/graham-bar.jpg",
    category: "Desserts",
    rating: 4.6,
    availability: "available" as const,
  },
  {
    name: "Leche Flan",
    price: 80,
    image: "/assets/uploads/lecheflan.jpg",
    category: "Desserts",
    rating: 4.9,
    availability: "available" as const,
  },
  {
    name: "Maja Blanca",
    price: 60,
    image: "/assets/uploads/maja-blanca.jpg",
    category: "Desserts",
    rating: 4.5,
    availability: "available" as const,
  },
  {
    name: "Iced Coffee",
    price: 45,
    image: "/assets/uploads/iced-coffee.jpg",
    category: "Drinks",
    rating: 4.4,
    availability: "available" as const,
  },
  {
    name: "Strawberry Shake",
    price: 65,
    image: "/assets/uploads/strawberry-shake.jpg",
    category: "Drinks",
    rating: 4.7,
    availability: "available" as const,
  },
  {
    name: "Pork BBQ",
    price: 90,
    image: "/assets/uploads/porkbarbecue.jpg",
    category: "Main Dishes",
    rating: 4.6,
    availability: "available" as const,
  },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#fff0de]">
      <Navbar showCartIcon={false} />

      {/* Hero Banner */}
      <section className="bg-[#b1454a] pt-[74px] pb-16 md:pb-20">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h1
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Our Menu
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto">
            Explore our selection of authentic Filipino dishes, freshly prepared
            with love
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 md:py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <CategoryFilter
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.name}
                name={product.name}
                price={product.price}
                image={product.image}
                category={product.category}
                rating={product.rating}
                availability={product.availability}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No products found in this category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#b1454a] py-16">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-white/70 mb-8">
            Contact us for custom orders or special requests
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-[#b1454a] px-8 py-3 rounded-full font-semibold text-sm hover:bg-white/90 transition-all duration-200 shadow-lg"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

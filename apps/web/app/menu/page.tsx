import Link from "next/link";
import {
  UtensilsCrossed,
  ChevronRight,
  ShoppingCart,
  Search,
} from "lucide-react";
import { Button } from "@repo/ui";
import { formatCurrency } from "@repo/utils";

const categories = [
  { id: "all", name: "All", icon: "🍽️" },
  { id: "appetizers", name: "Appetizers", icon: "🥟" },
  { id: "soups", name: "Soups", icon: "🍲" },
  { id: "main-dishes", name: "Main Dishes", icon: "🍛" },
  { id: "noodles", name: "Noodles", icon: "🍜" },
  { id: "rice", name: "Rice", icon: "🍚" },
  { id: "desserts", name: "Desserts", icon: "🍨" },
  { id: "drinks", name: "Drinks", icon: "🥤" },
];

const products = [
  {
    id: "1",
    name: "Kare-Kare",
    description: "Oxtail stew with peanut sauce, eggplant, and string beans",
    price: 250,
    category: "main-dishes",
    is_featured: true,
  },
  {
    id: "2",
    name: "Sinigang na Baboy",
    description: "Sour pork soup with tamarind, tomatoes, and leafy vegetables",
    price: 180,
    category: "soups",
    is_featured: true,
  },
  {
    id: "3",
    name: "Chicken Adobo",
    description: "Classic braised chicken in soy sauce, vinegar, garlic, and bay leaves",
    price: 150,
    category: "main-dishes",
    is_featured: true,
  },
  {
    id: "4",
    name: "Pancit Canton",
    description: "Stir-fried wheat noodles with vegetables, chicken, and shrimp",
    price: 120,
    category: "noodles",
    is_featured: false,
  },
  {
    id: "5",
    name: "Lumpiang Shanghai",
    description: "Crispy spring rolls stuffed with seasoned ground pork",
    price: 100,
    category: "appetizers",
    is_featured: false,
  },
  {
    id: "6",
    name: "Halo-Halo",
    description: "Shaved ice dessert with sweet beans, fruits, jellies, and leche flan",
    price: 90,
    category: "desserts",
    is_featured: true,
  },
  {
    id: "7",
    name: "Lechon Kawali",
    description: "Crispy deep-fried pork belly served with liver sauce",
    price: 200,
    category: "main-dishes",
    is_featured: false,
  },
  {
    id: "8",
    name: "Tinolang Manok",
    description: "Chicken ginger soup with green papaya and moringa leaves",
    price: 160,
    category: "soups",
    is_featured: false,
  },
  {
    id: "9",
    name: "Bicol Express",
    description: "Spicy pork stew cooked in coconut milk with chili peppers",
    price: 170,
    category: "main-dishes",
    is_featured: false,
  },
  {
    id: "10",
    name: "Pansit Bihon",
    description: "Stir-fried rice noodles with vegetables, chicken, and soy sauce",
    price: 110,
    category: "noodles",
    is_featured: false,
  },
  {
    id: "11",
    name: "Kakanin Sampler",
    description: "Assorted traditional Filipino rice cakes — puto, kutsinta, bibingka",
    price: 80,
    category: "desserts",
    is_featured: false,
  },
  {
    id: "12",
    name: "Sinaing na Tulingan",
    description: "Slow-cooked tuna belly wrapped in banana leaves with salted pork",
    price: 140,
    category: "main-dishes",
    is_featured: false,
  },
  {
    id: "13",
    name: "Gising-Gising",
    description: "Spicy pork and winged bean stew in coconut milk",
    price: 130,
    category: "main-dishes",
    is_featured: false,
  },
  {
    id: "14",
    name: "Buko Juice",
    description: "Fresh young coconut water served chilled",
    price: 40,
    category: "drinks",
    is_featured: false,
  },
  {
    id: "15",
    name: "Calamansi Juice",
    description: "Refreshing citrus drink made from fresh calamansi",
    price: 30,
    category: "drinks",
    is_featured: false,
  },
  {
    id: "16",
    name: "Garlic Rice",
    description: "Steamed rice sautéed with crispy garlic bits",
    price: 35,
    category: "rice",
    is_featured: false,
  },
];

const emojiMap: Record<string, string> = {
  "main-dishes": "🍛",
  soups: "🍲",
  noodles: "🍜",
  appetizers: "🥟",
  desserts: "🍨",
  drinks: "🥤",
  rice: "🍚",
};

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Suarez Food Hub
          </span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/menu"
            className="text-sm font-medium text-brand-600"
          >
            Menu
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function MenuPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-brand-50 to-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Our Menu
            </h1>
            <p className="mt-3 text-gray-500">
              Explore our selection of authentic Filipino dishes
            </p>
          </div>

          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  cat.id === "all"
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {categories
            .filter((c) => c.id !== "all")
            .map((cat) => {
              const categoryProducts = products.filter(
                (p) => p.category === cat.id
              );
              if (categoryProducts.length === 0) return null;
              return (
                <div key={cat.id} className="mb-12">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {cat.name}
                    </h2>
                  </div>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg"
                      >
                        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-5xl">
                          {emojiMap[product.category] || "🍽️"}
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-brand-600">
                                {product.name}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                {product.description}
                              </p>
                            </div>
                            <span className="shrink-0 text-lg font-bold text-brand-600">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                          <div className="mt-4">
                            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">
                              <ShoppingCart className="h-4 w-4" />
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mt-2 text-gray-500">
            Contact us for custom orders or special requests
          </p>
          <div className="mt-6">
            <Link href="/contact">
              <Button variant="outline" className="gap-2">
                Contact Us
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

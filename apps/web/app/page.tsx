import Link from "next/link";
import {
  UtensilsCrossed,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  Star,
  Truck,
  ShieldCheck,
  Heart,
  Instagram,
  Facebook,
} from "lucide-react";
import { Button } from "@repo/ui";
import { formatCurrency } from "@repo/utils";

const featuredProducts = [
  {
    id: "1",
    name: "Kare-Kare",
    description: "Oxtail stew with peanut sauce and vegetables",
    price: 250,
    category: "Main Dishes",
  },
  {
    id: "2",
    name: "Sinigang na Baboy",
    description: "Sour pork soup with tamarind, tomatoes, and vegetables",
    price: 180,
    category: "Soups",
  },
  {
    id: "3",
    name: "Chicken Adobo",
    description: "Classic Filipino braised chicken in soy sauce and vinegar",
    price: 150,
    category: "Main Dishes",
  },
  {
    id: "4",
    name: "Pancit Canton",
    description: "Stir-fried noodles with vegetables and meat",
    price: 120,
    category: "Noodles",
  },
  {
    id: "5",
    name: "Lumpiang Shanghai",
    description: "Crispy spring rolls stuffed with seasoned pork",
    price: 100,
    category: "Appetizers",
  },
  {
    id: "6",
    name: "Halo-Halo",
    description: "Shaved ice dessert with sweet beans, fruits, and leche flan",
    price: 90,
    category: "Desserts",
  },
];

const features = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Quick delivery straight to your doorstep in Janiuay and nearby areas.",
  },
  {
    icon: UtensilsCrossed,
    title: "Home-Cooked Quality",
    description: "Every dish is prepared fresh with authentic Filipino recipes.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Hygienic",
    description: "We follow strict food safety standards in every order.",
  },
  {
    icon: Heart,
    title: "Made with Love",
    description: "Each meal is crafted with care, just like home-cooked food.",
  },
];

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
            className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
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
          <Link href="/menu">
            <Button size="sm">Order Now</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
                <UtensilsCrossed className="h-4 w-4" />
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
                <Link
                  href="/menu"
                  className="text-sm text-gray-500 hover:text-brand-600"
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 hover:text-brand-600"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 hover:text-brand-600"
                >
                  Contact
                </Link>
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-brand-500 hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-brand-500 hover:text-white"
              >
                <Instagram className="h-4 w-4" />
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
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmOTczMTYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tNC0yYTEgMSAwIDEwMC0yIDAgMSAwIDAwMCAyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
                <Star className="h-4 w-4 fill-brand-400 text-brand-400" />
                Authentic Filipino Flavors
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Suarez
                <span className="text-brand-500"> Food Hub</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-gray-600">
                Experience the authentic taste of Filipino home cooking. From
                hearty stews to savory adobos, every dish is prepared with fresh
                ingredients and traditional recipes passed down through
                generations.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/menu">
                  <Button size="lg" className="gap-2">
                    Browse Menu
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="gap-2">
                    Our Story
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-500" />
                  30-45 min delivery
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  Janiuay, Iloilo
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-200 to-brand-300 opacity-30 blur-2xl" />
              <div className="relative rounded-3xl bg-white p-8 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  {featuredProducts.slice(0, 4).map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl bg-brand-50 p-4 transition hover:shadow-md"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-2xl">
                        🍲
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {product.category}
                      </p>
                      <p className="mt-2 text-sm font-bold text-brand-600">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Menu Section */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Featured Dishes
            </h2>
            <p className="mt-3 text-gray-500">
              A taste of our most popular Filipino dishes
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-6xl">
                  🍛
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-brand-600">
                        {product.category}
                      </span>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-brand-600">
                        {product.name}
                      </h3>
                    </div>
                    <span className="text-lg font-bold text-brand-600">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {product.description}
                  </p>
                  <Link
                    href="/menu"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    View on Menu
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/menu">
              <Button size="lg" variant="outline" className="gap-2">
                View Full Menu
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-200 to-brand-300 opacity-20 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-10 text-white">
                <UtensilsCrossed className="h-12 w-12 text-brand-200" />
                <h3 className="mt-6 text-2xl font-bold">Our Story</h3>
                <p className="mt-4 text-brand-100">
                  Born from a love for authentic Filipino cuisine, Suarez Food
                  Hub brings the warmth of home-cooked meals to your table. Our
                  recipes have been perfected over years, combining traditional
                  techniques with the freshest local ingredients.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold">100+</div>
                    <div className="text-sm text-brand-200">Happy Customers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">50+</div>
                    <div className="text-sm text-brand-200">Menu Items</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">5+</div>
                    <div className="text-sm text-brand-200">Years Serving</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                A Taste of Home in Every Bite
              </h2>
              <p className="mt-4 text-gray-600">
                Suarez Food Hub was founded with a simple mission: to share the
                rich flavors of Filipino cuisine with the community of Janiuay
                and beyond. We believe that food is more than sustenance — it is
                a way to connect, to share stories, and to celebrate culture.
              </p>
              <p className="mt-4 text-gray-600">
                Every dish we serve tells a story. From the slow-simmered
                kare-kare to the perfectly balanced sinigang, our recipes honor
                the traditions of Filipino home cooking while bringing them
                conveniently to your doorstep.
              </p>
              <div className="mt-8">
                <Link href="/about">
                  <Button variant="outline" className="gap-2">
                    Learn More About Us
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location / Service Area Section */}
      <section className="bg-brand-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              We Deliver to Your Area
            </h2>
            <p className="mt-3 text-gray-600">
              Currently serving Janiuay, Iloilo and surrounding municipalities
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Janiuay Proper
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                All barangays within Janiuay town proper
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Nearby Areas
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Selected barangays in adjacent municipalities
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Not Sure?
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Contact us to check if we deliver to your location
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to Order?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">
              Browse our menu and discover authentic Filipino dishes made fresh
              just for you. Fast delivery, great taste, affordable prices.
            </p>
            <div className="mt-8">
              <Link href="/menu">
                <Button
                  size="lg"
                  className="bg-white text-brand-600 hover:bg-brand-50"
                >
                  Order Now
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import Link from "next/link";
import {
  Search,
  ShoppingCart,
  Star,
  Check,
  MapPin,
  Phone,
  Clock,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";
import {
  Navbar,
  HeroSection,
  HowItWorks,
  TrendingSection,
  AboutSection,
  Footer,
  ProductCard,
} from "@repo/ui";

const popularFoods = [
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
    name: "Dynamite Lumpia",
    price: 65,
    image: "/assets/dynamite-lumpia.jpg",
    category: "Appetizers",
    rating: 4.9,
    availability: "available" as const,
  },
];

const findUsItems = [
  { name: "Authentic Filipino Recipes" },
  { name: "Fresh Daily Ingredients" },
  { name: "Fast & Reliable Delivery" },
  { name: "Affordable Prices" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fff0de]">
      <Navbar showCartIcon={false} />

      {/* Hero Section */}
      <HeroSection
        title="Taste the Best Filipino Food in Town"
        description="From crispy siomai to savory lumpia, we serve authentic Filipino dishes made with love and fresh ingredients. Order now and satisfy your cravings!"
        ctaText="Order Now"
        ctaHref="/menu"
        imageSrc="/assets/hero-siomai.png"
      />

      {/* Popular Foods */}
      <section className="bg-[#b1454a] py-20 md:py-28">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Popular Food
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-14 max-w-xl mx-auto">
            Our most loved dishes, chosen by thousands of happy customers
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {popularFoods.map((food) => (
              <div
                key={food.name}
                className="relative bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl group"
              >
                <div className="relative h-[200px] overflow-hidden">
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-gray-800">
                      {food.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    {food.category}
                  </p>
                  <h3
                    className="text-lg font-semibold text-gray-900 mb-1"
                    style={{ fontFamily: "var(--playfair-display)" }}
                  >
                    {food.name}
                  </h3>
                  <p className="text-[#b1454a] font-bold text-base mb-4">
                    ₱{food.price.toFixed(2)}
                  </p>
                  <Link
                    href="/menu"
                    className="block w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-[#b1454a] text-white hover:bg-[#9a3a3f] active:scale-95 text-center"
                  >
                    Select
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/menu"
            className="inline-block bg-white text-[#b1454a] px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
          >
            Explore All Food
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Trending Sections */}
      <TrendingSection
        title="Filipino Street Food"
        subtitle="Trending Now"
        description="Discover our handpicked selection of authentic Filipino street food favorites. Perfect for merienda or any time you crave something delicious."
        items={[
          { name: "Crispy Fried Siomai" },
          { name: "Dynamite Lumpia" },
          { name: "Pork BBQ Skewers" },
          { name: "Fish Ball & Kikiam" },
        ]}
        imageSrc="/assets/fried-siomai.jpg"
        imageAlt="Filipino Street Food"
      />

      <TrendingSection
        title="Refreshing Drinks"
        subtitle="Quench Your Thirst"
        description="Cool down with our refreshing drinks made from fresh ingredients. The perfect complement to your favorite Filipino meal."
        items={[
          { name: "Fresh Buko Juice" },
          { name: "Iced Calamansi" },
          { name: "Strawberry Shake" },
          { name: "Iced Coffee" },
        ]}
        imageSrc="/assets/uploads/drinks.jpg"
        imageAlt="Refreshing Drinks"
        reversed
      />

      {/* About Us */}
      <AboutSection
        subtitle="About Us"
        title="Deliciously Made, Right at Your Doorstep"
        description="We started as a small food stall near WVSU, serving freshly made siomai and other Filipino favorites. Today, Suarez Food Hub continues the tradition of delivering quality food with a personal touch — affordable, fast, and always made with love."
        storeImage="/assets/store1.jpg"
        foodImage="/assets/steamed-siomai.jpg"
      />

      {/* Find Us */}
      <section className="py-16 md:py-24 bg-[#fff0de]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            {/* Map */}
            <div className="flex-1 w-full">
              <div className="rounded-3xl overflow-hidden shadow-2xl h-[400px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3947.5!2d122.506551!3d10.950087!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDU3JzAwLjAiTiAxMjLCsDMwJzIzLjYiRQ!5e0!3m2!1sen!2sph!4v1"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Suarez Food Hub Location"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-[#b1454a] text-sm font-semibold uppercase tracking-wider mb-3">
                Visit Us
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                Visit Us in Person
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                Come visit us at our store in Janiuay, Iloilo. We&apos;d love
                to serve you our authentic Filipino dishes fresh from the
                kitchen.
              </p>

              <ul className="space-y-4 mb-8">
                {findUsItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 justify-center md:justify-start"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#b1454a]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#b1454a]" />
                    </div>
                    <span className="text-gray-700 text-sm font-medium">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-[#b1454a]" />
                  Janiuay, Iloilo
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-[#b1454a]" />
                  +63 912 345 6789
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-[#b1454a]" />
                  Mon-Sat: 10AM - 9PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

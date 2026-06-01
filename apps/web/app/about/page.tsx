import Link from "next/link";
import { Heart, Award, Users, Leaf } from "lucide-react";
import AuthNavbar from "../../components/AuthNavbar";
import { Footer } from "@repo/ui";

const values = [
  {
    icon: Heart,
    title: "Passion for Food",
    description:
      "Every dish is prepared with genuine love and care. We believe great food starts with passion in the kitchen.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "We are proud to serve the Janiuay community. Our neighbors are our customers, and we treat them like family.",
  },
  {
    icon: Leaf,
    title: "Fresh Ingredients",
    description:
      "We source the freshest local ingredients daily. Quality is never compromised — from market to plate.",
  },
  {
    icon: Award,
    title: "Authentic Recipes",
    description:
      "Our recipes are rooted in Filipino culinary tradition, passed down and perfected over generations.",
  },
];

const timeline = [
  {
    year: "2019",
    title: "The Beginning",
    description:
      "Suarez Food Hub started as a small home kitchen serving neighbors in Janiuay. Armed with family recipes and a passion for cooking, we began taking orders from friends and family.",
  },
  {
    year: "2020",
    title: "Growing Demand",
    description:
      "Word spread quickly about our authentic Filipino dishes. We expanded our menu and started offering delivery services to more areas in Janiuay.",
  },
  {
    year: "2022",
    title: "Formal Operations",
    description:
      "We formalized our operations, invested in proper kitchen equipment, and built a team of dedicated cooks and delivery riders.",
  },
  {
    year: "2024",
    title: "Digital Presence",
    description:
      "We launched our online ordering platform, making it easier for customers to browse our menu and place orders from anywhere.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fff0de]">
      <AuthNavbar showCartIcon={false} />

      {/* Hero */}
      <section className="bg-[#b1454a] pt-[74px] pb-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">
            About Us
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            About Suarez Food Hub
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            We are a family-owned Filipino food business based in Janiuay,
            Iloilo, dedicated to bringing authentic home-cooked meals to your
            doorstep.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            {/* Image */}
            <div className="flex-1 relative">
              <div className="bg-white rounded-3xl p-4 shadow-lg">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="/assets/store1.jpg"
                      alt="Suarez Food Hub store"
                      className="w-full h-[220px] object-cover"
                    />
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="rounded-2xl overflow-hidden">
                    <img
                      src="/assets/steamed-siomai.jpg"
                      alt="Our signature siomai"
                      className="w-full h-[220px] object-cover"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                  <Link
                    href="/menu"
                    className="inline-block bg-[#121212] text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-200 shadow-xl whitespace-nowrap"
                  >
                    Order Now
                  </Link>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-center md:text-left pt-8 md:pt-0">
              <p className="text-[#b1454a] text-sm font-semibold uppercase tracking-wider mb-3">
                Our Story
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                A Taste of Home in Every Bite
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-4 max-w-lg mx-auto md:mx-0">
                Suarez Food Hub was founded with a simple mission: to share the
                rich flavors of Filipino cuisine with the community of Janiuay
                and beyond. We believe that food is more than sustenance — it is
                a way to connect, to share stories, and to celebrate culture.
              </p>
              <p className="text-gray-600 text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                Every dish we serve tells a story. From the slow-simmered
                kare-kare to the perfectly balanced sinigang, our recipes honor
                the traditions of Filipino home cooking while bringing them
                conveniently to your doorstep.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-24 bg-white/50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-[#b1454a]/10 rounded-2xl flex items-center justify-center text-[#b1454a] mb-6">
                <Heart className="w-7 h-7" />
              </div>
              <h2
                className="text-2xl font-bold text-gray-900 mb-4"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                Our Mission
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To share the rich and diverse flavors of Filipino cuisine with
                our community. We aim to provide convenient access to authentic,
                high-quality home-cooked meals that bring joy and comfort to
                every table.
              </p>
            </div>
            <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-[#b1454a]/10 rounded-2xl flex items-center justify-center text-[#b1454a] mb-6">
                <Award className="w-7 h-7" />
              </div>
              <h2
                className="text-2xl font-bold text-gray-900 mb-4"
                style={{ fontFamily: "var(--playfair-display)" }}
              >
                Our Vision
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To become the most trusted Filipino food hub in Iloilo, known
                for our unwavering commitment to quality, authenticity, and
                customer satisfaction. We envision a future where great Filipino
                food is accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-900"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              Our Values
            </h2>
            <p className="text-gray-500 mt-3">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 mx-auto mb-5 bg-[#b1454a]/10 rounded-2xl flex items-center justify-center text-[#b1454a]">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3
                  className="text-base font-bold text-gray-900 mb-2"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {value.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 bg-white/50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-900"
              style={{ fontFamily: "var(--playfair-display)" }}
            >
              Our Journey
            </h2>
            <p className="text-gray-500 mt-3">
              From a home kitchen to your neighborhood food hub
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-[#b1454a]/20 sm:left-1/2 sm:-translate-x-px" />
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col sm:flex-row ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  } items-start gap-6`}
                >
                  <div className="absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#b1454a] bg-white sm:left-1/2" />
                  <div
                    className={`ml-10 flex-1 sm:ml-0 ${
                      index % 2 === 0
                        ? "sm:text-right sm:pr-12"
                        : "sm:text-left sm:pl-12"
                    }`}
                  >
                    <span className="inline-block rounded-full bg-[#b1454a]/10 px-3 py-1 text-sm font-semibold text-[#b1454a]">
                      {item.year}
                    </span>
                    <h3
                      className="mt-2 text-lg font-bold text-gray-900"
                      style={{ fontFamily: "var(--playfair-display)" }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#b1454a] py-16">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Want to taste the difference?
          </h2>
          <p className="text-white/70 mb-8">
            Order now and experience authentic Filipino home cooking
          </p>
          <Link
            href="/menu"
            className="inline-block bg-white text-[#b1454a] px-10 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg"
          >
            Browse Our Menu
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

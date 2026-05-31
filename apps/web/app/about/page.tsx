import Link from "next/link";
import {
  UtensilsCrossed,
  ChevronRight,
  Heart,
  Users,
  Leaf,
  Award,
} from "lucide-react";
import { Button } from "@repo/ui";

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
            className="text-sm font-medium text-brand-600"
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

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              About Suarez Food Hub
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              We are a family-owned Filipino food business based in Janiuay,
              Iloilo, dedicated to bringing authentic home-cooked meals to your
              doorstep.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Our Mission
              </h2>
              <p className="mt-4 text-gray-600">
                To share the rich and diverse flavors of Filipino cuisine with
                our community. We aim to provide convenient access to authentic,
                high-quality home-cooked meals that bring joy and comfort to
                every table.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Our Vision
              </h2>
              <p className="mt-4 text-gray-600">
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
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
            <p className="mt-3 text-gray-500">
              The principles that guide everything we do
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Timeline */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Our Journey</h2>
            <p className="mt-3 text-gray-500">
              From a home kitchen to your neighborhood food hub
            </p>
          </div>
          <div className="relative mt-12">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-brand-200 sm:left-1/2 sm:-translate-x-px" />
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col sm:flex-row ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  } items-start gap-6`}
                >
                  <div className="absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-brand-500 bg-white sm:left-1/2" />
                  <div
                    className={`ml-10 flex-1 sm:ml-0 ${
                      index % 2 === 0 ? "sm:text-right sm:pr-12" : "sm:text-left sm:pl-12"
                    }`}
                  >
                    <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                      {item.year}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">
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
      <section className="border-t border-gray-100 bg-brand-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Want to taste the difference?
          </h2>
          <p className="mt-3 text-gray-600">
            Order now and experience authentic Filipino home cooking
          </p>
          <div className="mt-8">
            <Link href="/menu">
              <Button size="lg" className="gap-2">
                Browse Our Menu
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

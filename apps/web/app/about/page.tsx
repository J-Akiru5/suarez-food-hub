import { Footer } from "@repo/ui";
import { Award, ChevronRight, Heart, Leaf, Users } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../../components/AuthNavbar";

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
    description: "We source the freshest local ingredients daily. Quality is never compromised — from market to plate.",
  },
  {
    icon: Award,
    title: "Authentic Recipes",
    description: "Our recipes are rooted in Filipino culinary tradition, passed down and perfected over generations.",
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
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      <AuthNavbar showCartIcon={false} />

      {/* Hero */}
      <section
        className="pt-[74px] py-16 sm:py-24"
        style={{
          background:
            "linear-gradient(to bottom right, color-mix(in srgb, var(--primary-color) 8%, white), var(--color-cream))",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              className="text-4xl font-bold sm:text-5xl"
              style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
            >
              About Suarez Food Hub
            </h1>
            <p
              className="mt-6 text-lg"
              style={{ color: "color-mix(in srgb, var(--secondary-color) 60%, transparent)" }}
            >
              We are a family-owned Filipino food business based in Janiuay, Iloilo, dedicated to bringing authentic
              home-cooked meals to your doorstep.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="glass-card p-8">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                  color: "var(--primary-color)",
                }}
              >
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold" style={{ color: "var(--secondary-color)" }}>
                Our Mission
              </h2>
              <p className="mt-4" style={{ color: "color-mix(in srgb, var(--secondary-color) 60%, transparent)" }}>
                To share the rich and diverse flavors of Filipino cuisine with our community. We aim to provide
                convenient access to authentic, high-quality home-cooked meals that bring joy and comfort to every
                table.
              </p>
            </div>
            <div className="glass-card p-8">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                  color: "var(--primary-color)",
                }}
              >
                <Award className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold" style={{ color: "var(--secondary-color)" }}>
                Our Vision
              </h2>
              <p className="mt-4" style={{ color: "color-mix(in srgb, var(--secondary-color) 60%, transparent)" }}>
                To become the most trusted Filipino food hub in Iloilo, known for our unwavering commitment to quality,
                authenticity, and customer satisfaction. We envision a future where great Filipino food is accessible to
                everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20" style={{ background: "color-mix(in srgb, var(--primary-color) 3%, white)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
            >
              Our Values
            </h2>
            <p className="mt-3" style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}>
              The principles that guide everything we do
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="glass-card p-6 text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                    color: "var(--primary-color)",
                  }}
                >
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold" style={{ color: "var(--secondary-color)" }}>
                  {value.title}
                </h3>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}
                >
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
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
            >
              Our Journey
            </h2>
            <p className="mt-3" style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}>
              From a home kitchen to your neighborhood food hub
            </p>
          </div>
          <div className="relative mt-12">
            <div
              className="absolute left-4 top-0 h-full w-0.5 sm:left-1/2 sm:-translate-x-px"
              style={{ background: "color-mix(in srgb, var(--primary-color) 30%, transparent)" }}
            />
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col sm:flex-row ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  } items-start gap-6`}
                >
                  <div
                    className="absolute left-4 top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 bg-white sm:left-1/2"
                    style={{ borderColor: "var(--primary-color)" }}
                  />
                  <div
                    className={`ml-10 flex-1 sm:ml-0 ${
                      index % 2 === 0 ? "sm:text-right sm:pr-12" : "sm:text-left sm:pl-12"
                    }`}
                  >
                    <span
                      className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                        color: "var(--primary-color)",
                      }}
                    >
                      {item.year}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold" style={{ color: "var(--secondary-color)" }}>
                      {item.title}
                    </h3>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}
                    >
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
      <section
        className="py-16"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary-color) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary-color) 5%, white)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold"
            style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
          >
            Want to taste the difference?
          </h2>
          <p className="mt-3" style={{ color: "color-mix(in srgb, var(--secondary-color) 60%, transparent)" }}>
            Order now and experience authentic Filipino home cooking
          </p>
          <div className="mt-8">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-base transition-all hover:-translate-y-0.5"
              style={{ background: "var(--primary-color)" }}
            >
              Browse Our Menu
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

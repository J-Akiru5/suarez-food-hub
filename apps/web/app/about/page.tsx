import { Footer } from "@repo/ui";
import { Award, ChevronRight, Heart, Leaf, Users } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../../components/AuthNavbar";

const values = [
  {
    icon: Heart,
    title: "Home-Style Cooking",
    description: "We cook exactly how we cook for our own family—no shortcuts, just honest, traditional methods.",
  },
  {
    icon: Users,
    title: "Rooted in Janiuay",
    description: "Operating from our hometown in Iloilo, we rely on local suppliers and serve our immediate neighbors.",
  },
  {
    icon: Leaf,
    title: "Market Fresh",
    description: "Our ingredients come straight from the local market each morning to ensure our food is always fresh.",
  },
  {
    icon: Award,
    title: "Family Recipes",
    description: "Our menu is built on generations of Suarez family recipes that have stood the test of time.",
  },
];

const timeline = [
  {
    year: "2019",
    title: "Starting Out",
    description:
      "We began as a small neighborhood kitchen, cooking our signature meals for friends and nearby families in Janiuay.",
  },
  {
    year: "2020",
    title: "Expanding Reach",
    description:
      "As demand grew through word of mouth, we expanded our daily menu and introduced a dedicated delivery service.",
  },
  {
    year: "2022",
    title: "Full Operations",
    description:
      "We officially structured our kitchen and logistics, allowing us to handle larger volumes and catering orders.",
  },
  {
    year: "2024",
    title: "Going Digital",
    description:
      "To streamline ordering, we launched our online food hub, giving our customers an easier way to browse and order.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      <AuthNavbar showCartIcon={false} />

      {/* Hero */}
      <section
        className="py-16 sm:py-24"
        style={{
          marginTop: "72px",
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
                To bring real, home-cooked Filipino food straight to our neighbors in Janiuay. We focus on consistent
                quality, fair prices, and food that actually tastes like it came from a family kitchen.
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
                To be the most reliable local food hub in Iloilo—the place people think of first when they want a good,
                hearty meal without having to cook it themselves.
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
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex flex-col sm:flex-row ${
                    index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  } items-start gap-6`}
                >
                  <div className="hidden sm:block flex-1" />
                  <div className={`flex-1 ${index % 2 === 0 ? "sm:text-right sm:pr-12" : "sm:text-left sm:pl-12"}`}>
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

import Link from "next/link";
import {
  UtensilsCrossed,
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { Button } from "@repo/ui";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    details: ["+63 912 345 6789", "+63 917 123 4567"],
    action: "tel:+639123456789",
  },
  {
    icon: Mail,
    title: "Email",
    details: ["orders@suarezfoodhub.com", "info@suarezfoodhub.com"],
    action: "mailto:orders@suarezfoodhub.com",
  },
  {
    icon: MapPin,
    title: "Location",
    details: ["Janiuay, Iloilo", "Philippines"],
    action: "https://maps.google.com/?q=Janiuay+Iloilo",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Monday - Saturday: 10:00 AM - 9:00 PM", "Sunday: Closed"],
    action: null,
  },
];

const socialLinks = [
  {
    icon: Facebook,
    name: "Facebook",
    url: "https://facebook.com/suarezfoodhub",
    color: "hover:bg-blue-600 hover:text-white",
  },
  {
    icon: Instagram,
    name: "Instagram",
    url: "https://instagram.com/suarezfoodhub",
    color: "hover:bg-pink-500 hover:text-white",
  },
  {
    icon: MessageCircle,
    name: "Viber",
    url: "viber://chat?number=+639123456789",
    color: "hover:bg-purple-600 hover:text-white",
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
            className="text-sm font-medium text-brand-600"
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Have questions, special requests, or want to place an order? We
              would love to hear from you!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info) => (
              <div
                key={info.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <info.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {info.title}
                </h3>
                <div className="mt-3 space-y-1">
                  {info.details.map((detail) => (
                    <p key={detail} className="text-sm text-gray-500">
                      {info.action && info.details.indexOf(detail) === 0 ? (
                        <a
                          href={info.action}
                          className="hover:text-brand-600"
                          target={
                            info.action.startsWith("http")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            info.action.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                        >
                          {detail}
                        </a>
                      ) : (
                        detail
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Send Us a Message
              </h2>
              <p className="mt-2 text-gray-500">
                Fill out the form below and we will get back to you as soon as
                possible.
              </p>
              <form className="mt-8 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Juan Dela Cruz"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+63 912 345 6789"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="juan@example.com"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Select a topic</option>
                    <option value="order">Place an Order</option>
                    <option value="catering">Catering Inquiry</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Tell us how we can help..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Map & Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Our Location
                </h2>
                <p className="mt-2 text-gray-500">
                  Visit us or check if we deliver to your area
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <div className="flex h-72 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                  <div className="text-center">
                    <MapPin className="mx-auto h-12 w-12 text-brand-400" />
                    <p className="mt-3 text-sm font-medium text-brand-700">
                      Janiuay, Iloilo
                    </p>
                    <p className="mt-1 text-xs text-brand-500">
                      Philippines
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Follow Us
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Stay connected for updates, promos, and new dishes
                </p>
                <div className="mt-4 flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition ${social.color}`}
                      title={social.name}
                    >
                      <social.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Frequently Asked Questions
                </h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      What are your delivery hours?
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      We deliver from 10:00 AM to 9:00 PM, Monday through
                      Saturday.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Do you accept GCash?
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Yes! We accept GCash, PayMaya, and cash on delivery.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      How far do you deliver?
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      We deliver within Janiuay and select nearby areas. Contact
                      us to check if your location is covered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

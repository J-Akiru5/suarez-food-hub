"use client";

import { Footer } from "@repo/ui";
import { Camera, Clock, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import AuthNavbar from "../../components/AuthNavbar";

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
    action: "https://maps.google.com/?q=10.950087,122.506551",
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
    icon: Globe,
    name: "Facebook",
    url: "https://facebook.com/suarezfoodhub",
    color: "hover:bg-blue-600 hover:text-white",
  },
  {
    icon: Camera,
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

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: "color-mix(in srgb, var(--primary-color) 5%, white)" }}>
      <AuthNavbar showCartIcon={false} />

      {/* Hero */}
      <section className="pt-[74px] py-16 md:py-24" style={{ background: "var(--primary-color)" }}>
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">Get in Touch</p>
          <h1
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Contact Us
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Have questions, special requests, or want to place an order? We would love to hear from you!
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info) => (
              <div
                key={info.title}
                className="glass-card p-6 text-center hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--primary-color) 10%, transparent)", color: "var(--primary-color)" }}
                >
                  <info.icon className="w-6 h-6" />
                </div>
                <h3
                  className="text-base font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "var(--playfair-display)" }}
                >
                  {info.title}
                </h3>
                <div className="space-y-1">
                  {info.details.map((detail) => (
                    <p key={detail} className="text-sm text-gray-500">
                      {info.action && info.details.indexOf(detail) === 0 ? (
                        <a
                          href={info.action}
                          className="transition-colors"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary-color)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                          target={info.action.startsWith("http") ? "_blank" : undefined}
                          rel={info.action.startsWith("http") ? "noopener noreferrer" : undefined}
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

      {/* Map & Social */}
      <section className="py-16 md:py-24" style={{ background: "color-mix(in srgb, var(--primary-color) 3%, white)" }}>
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Map */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--playfair-display)" }}>
                Our Location
              </h2>
              <p className="text-gray-500 mb-6">Visit us or check if we deliver to your area</p>
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

            {/* Social & FAQ */}
            <div className="space-y-8">
              {/* Social Links */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--playfair-display)" }}>
                  Follow Us
                </h3>
                <p className="text-sm text-gray-500 mb-4">Stay connected for updates, promos, and new dishes</p>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 transition-all duration-200 ${social.color}`}
                      title={social.name}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--playfair-display)" }}>
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">What are your delivery hours?</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      We deliver from 10:00 AM to 9:00 PM, Monday through Saturday.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Do you accept GCash?</h4>
                    <p className="mt-1 text-sm text-gray-500">Yes! We accept GCash, PayMaya, and cash on delivery.</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">How far do you deliver?</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      We deliver within Janiuay and select nearby areas. Contact us to check if your location is
                      covered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

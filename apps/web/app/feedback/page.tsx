"use client";

import { Footer } from "@repo/ui";
import { MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Feedback from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    window.open(`mailto:info@suarezfoodhub.com?subject=${subject}&body=${body}`, "_blank");
    setSent(true);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      <AuthNavbar showCartIcon={false} />

      {/* Hero */}
      <section className="pt-[74px] py-16 md:py-24" style={{ background: "var(--primary-color)" }}>
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">We Value Your Input</p>
          <h1
            className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            Send Us Feedback
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Help us improve! Share your thoughts, suggestions, or report an issue.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24">
        <div className="max-w-[600px] mx-auto px-6">
          {sent ? (
            <div className="glass-card p-12 text-center">
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--primary-color) 10%, transparent)" }}
              >
                <MessageCircle className="w-8 h-8" style={{ color: "var(--primary-color)" }} />
              </div>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
              >
                Thank You!
              </h2>
              <p className="mb-6" style={{ color: "color-mix(in srgb, var(--secondary-color) 60%, transparent)" }}>
                Your feedback has been submitted. We appreciate your input!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: "var(--primary-color)" }}
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--primary-color) 10%, transparent)" }}
                >
                  <MessageCircle className="w-6 h-6" style={{ color: "var(--primary-color)" }} />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: "var(--secondary-color)", fontFamily: "var(--playfair-display)" }}
                  >
                    We'd love to hear from you
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: "color-mix(in srgb, var(--secondary-color) 50%, transparent)" }}
                  >
                    Your feedback helps us serve you better
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--secondary-color)" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl outline-none transition-all"
                    style={{
                      background: "white",
                      border: "1px solid color-mix(in srgb, var(--primary-color) 15%, transparent)",
                      color: "var(--secondary-color)",
                      fontFamily: "var(--plus-jakarta-sans)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-color)")}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary-color) 15%, transparent)")
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--secondary-color)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl outline-none transition-all"
                    style={{
                      background: "white",
                      border: "1px solid color-mix(in srgb, var(--primary-color) 15%, transparent)",
                      color: "var(--secondary-color)",
                      fontFamily: "var(--plus-jakarta-sans)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-color)")}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary-color) 15%, transparent)")
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--secondary-color)" }}>
                    Message
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl outline-none transition-all resize-none"
                    style={{
                      background: "white",
                      border: "1px solid color-mix(in srgb, var(--primary-color) 15%, transparent)",
                      color: "var(--secondary-color)",
                      fontFamily: "var(--plus-jakarta-sans)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary-color)")}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary-color) 15%, transparent)")
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-base transition-all hover:-translate-y-0.5 border-none cursor-pointer"
                  style={{ background: "var(--primary-color)" }}
                >
                  <Send className="w-4 h-4" />
                  Send Feedback
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

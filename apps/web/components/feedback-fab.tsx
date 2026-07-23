"use client";

import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function FeedbackFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const hiddenPages = ["/menu", "/checkout"];
  if (hiddenPages.includes(pathname)) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          page_url: window.location.href,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(!open);
          setSent(false);
          setError("");
        }}
        aria-label="Feedback"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--primary-color)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(177, 69, 74, 0.35)",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            zIndex: 9999,
            width: 340,
            maxWidth: "calc(100vw - 48px)",
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            overflow: "hidden",
            animation: "slideUp 0.25s ease-out",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              background: "var(--primary-color)",
              color: "#fff",
            }}
          >
            <h4 style={{ margin: 0, fontFamily: "var(--playfair-display)", fontSize: 18 }}>Send Feedback</h4>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Help us improve your experience</p>
          </div>

          {sent ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--primary-color) 10%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Send size={20} style={{ color: "var(--primary-color)" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--secondary-color)", margin: 0 }}>Thank you!</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>Your feedback has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                required
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontFamily: "var(--plus-jakarta-sans)",
                  fontSize: 14,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "6px 0 0" }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "12px 20px",
                  borderRadius: 30,
                  border: "none",
                  background: submitting || !message.trim() ? "#e2e8f0" : "var(--primary-color)",
                  color: submitting || !message.trim() ? "#94a3b8" : "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting || !message.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

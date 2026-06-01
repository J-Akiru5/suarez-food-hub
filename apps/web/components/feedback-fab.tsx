"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

export function FeedbackFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
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
            <h4 style={{ margin: 0, fontFamily: "var(--playfair-display)", fontSize: 18 }}>
              Send Feedback
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
              Help us improve your experience
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const message = new FormData(form).get("message") as string;
              if (!message?.trim()) return;
              window.open(
                `mailto:feedback@suarezfoodhub.com?subject=Feedback&body=${encodeURIComponent(message)}`,
                "_blank"
              );
              form.reset();
              setOpen(false);
            }}
            style={{ padding: 20 }}
          >
            <textarea
              name="message"
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
            <button
              type="submit"
              style={{
                width: "100%",
                marginTop: 12,
                padding: "12px 20px",
                borderRadius: 30,
                border: "none",
                background: "var(--primary-color)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Send via Email
            </button>
          </form>
        </div>
      )}
    </>
  );
}

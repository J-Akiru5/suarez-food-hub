import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SFH Rider",
  description: "Suarez Food Hub Delivery Rider App",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SFH Rider",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b85c38",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>{/* Leaflet CSS is imported in components/DeliveryMap.tsx (bundled) */}</head>
      <body className="bg-gray-50 min-h-screen">
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker.register("/sw.js").catch(() => {});
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}

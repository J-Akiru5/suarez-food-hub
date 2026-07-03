import type { Metadata, Viewport } from "next";
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
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoIhBjUbPj0nK1ypv6XSA7b83Y8n6l3O63O3Y="
          crossOrigin=""
        />
      </head>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}

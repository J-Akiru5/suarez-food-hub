import type { Metadata } from "next";
import "@repo/ui/globals.css";

export const metadata: Metadata = {
  title: "Suarez Food Hub - Authentic Filipino Food",
  description:
    "Authentic Filipino food delivered to your doorstep in Janiuay, Iloilo. Order crispy siomai, kare-kare, sinigang, and more from Suarez Food Hub!",
  keywords: [
    "Filipino food",
    "food delivery",
    "Janiuay",
    "Iloilo",
    "Suarez Food Hub",
    "Filipino cuisine",
    "siomai",
    "home delivery",
  ],
  openGraph: {
    title: "Suarez Food Hub - Authentic Filipino Food",
    description:
      "Authentic Filipino food delivered to your doorstep in Janiuay, Iloilo.",
    type: "website",
    locale: "en_PH",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

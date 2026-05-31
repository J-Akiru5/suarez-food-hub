import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@repo/ui/globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Suarez Food Hub | Authentic Filipino Food",
  description:
    "Authentic Filipino food delivered to your doorstep in Janiuay, Iloilo. Order now from Suarez Food Hub!",
  keywords: [
    "Filipino food",
    "food delivery",
    "Janiuay",
    "Iloilo",
    "Suarez Food Hub",
    "Filipino cuisine",
    "home delivery",
  ],
  openGraph: {
    title: "Suarez Food Hub | Authentic Filipino Food",
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
      <body className={`${jakartaSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

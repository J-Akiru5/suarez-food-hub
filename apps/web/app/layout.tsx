import type { Metadata } from "next";
import "./globals.css";
import "aos/dist/aos.css";
import { AuthProvider } from "../components/auth-provider";
import { FeedbackFab } from "../components/feedback-fab";

export const metadata: Metadata = {
  title: "Suarez Food Hub",
  description: "Experience the Best Siomai in Town",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <FeedbackFab />
        </AuthProvider>
      </body>
    </html>
  );
}

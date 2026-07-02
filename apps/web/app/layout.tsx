import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";
import { FeedbackFab } from "../components/feedback-fab";
import { GuestThemeProvider } from "../components/guest-theme-provider";

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
          <GuestThemeProvider>
            {children}
            <FeedbackFab />
          </GuestThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import "aos/dist/aos.css";
import { AuthProvider } from "../components/auth-provider";
import { FeedbackFab } from "../components/feedback-fab";

export const metadata: Metadata = {
  title: "Suarez Food Hub",
  description: "Experience the Best Siomai in Town",
  icons: {
    icon: "/assets/sushi.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <FeedbackFab />
        </AuthProvider>
      </body>
    </html>
  );
}

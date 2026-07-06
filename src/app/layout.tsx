import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Platform — Charts & Market Analysis",
  description: "Real-time market analysis with interactive charts, indicators, and watchlists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

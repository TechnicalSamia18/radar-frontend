import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from our own domain (ADR-002).
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic"],
});

export const metadata: Metadata = {
  // Absolute base for links and previews when the site is shared.
  metadataBase: new URL("https://radar-frontend-pi.vercel.app"),
  title: "Radar — real openings from Pakistani software houses, and how you fit",
  description:
    "Radar checks Pakistani software houses every morning, scores new openings against your resume, and tracks your applications.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans font-light">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bengaluru Startup Jobs Map | Discover Tech Ecosystem Careers",
  description:
    "Explore tech startups and discover engineering, product, and AI opportunities across Bengaluru's startup corridors, from Koramangala to Whitefield.",
  keywords: [
    "Bengaluru Startup Jobs",
    "Bangalore tech jobs",
    "Bengaluru startup map",
    "Koramangala tech jobs",
    "HSR Layout startups",
    "Indiranagar jobs",
    "Whitefield tech park",
    "Karnataka tech ecosystem",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col font-sans antialiased text-slate-900 bg-white`}
      >
        {children}
      </body>
    </html>
  );
}

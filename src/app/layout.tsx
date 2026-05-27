import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VaRyGasy (VRG) — Accessoires Gaming Mobile | Madagascar",
  description: "Finger sleeves anti-transpiration, ventilateurs de refroidissement et accessoires gaming pour dominer sur PUBG Mobile, Free Fire et MLBB. Livraison rapide à Madagascar.",
  keywords: ["VaRyGasy", "gaming", "finger sleeves", "ventilateur", "accessoires gaming", "Madagascar", "PUBG Mobile", "Free Fire"],
  icons: {
    icon: "/images/logo/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#080810', color: '#f0f0f5', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0, overflowX: 'hidden' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

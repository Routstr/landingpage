import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModelsProvider } from "./contexts/ModelsContext";
import { NostrProvider } from "@/context/NostrContext";
import { PricingProvider } from "./contexts/PricingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://routstr.com"),
  title: {
    default: "Routstr - Decentralized AI Inference Router",
    template: "%s | Routstr",
  },
  description:
    "The future of AI access is permissionless, private, and decentralized. Access top AI models with Bitcoin Lightning payments.",
  keywords: [
    "AI",
    "Decentralized AI",
    "LLM",
    "Bitcoin",
    "Lightning Network",
    "Inference",
    "API",
    "Cashu",
    "Nostr",
  ],
  authors: [{ name: "Routstr Team" }],
  creator: "Routstr",
  publisher: "Routstr",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://routstr.com",
    title: "Routstr - Decentralized AI Inference Router",
    description:
      "Access top AI models with Bitcoin Lightning payments. Permissionless, private, and decentralized.",
    siteName: "Routstr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Routstr - Decentralized AI Inference Router",
    description:
      "Access top AI models with Bitcoin Lightning payments. Permissionless, private, and decentralized.",
    creator: "@routstr",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black min-h-screen`}
      >
        <ModelsProvider>
          <NostrProvider>
            <PricingProvider>{children}</PricingProvider>
          </NostrProvider>
        </ModelsProvider>
      </body>
    </html>
  );
}

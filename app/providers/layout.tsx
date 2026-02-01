import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Providers - Routstr",
  description:
    "Browse providers available through Routstr's decentralized marketplace. Connect with top AI inference nodes.",
  openGraph: {
    title: "AI Providers - Routstr",
    description:
      "Browse providers available through Routstr's decentralized marketplace. Connect with top AI inference nodes.",
    url: "https://routstr.com/providers",
  },
  twitter: {
    title: "AI Providers - Routstr",
    description:
      "Browse providers available through Routstr's decentralized marketplace. Connect with top AI inference nodes.",
  },
};

export default function ProvidersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

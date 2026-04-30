import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Routstrd - Uncensorable AI Access via Nostr & Bitcoin",
  description:
    "Routstrd is the only tool you need for uncensorable access to AI. Powered by Nostr and Bitcoin — no KYC, no credit cards, no permissions.",
  openGraph: {
    title: "Routstrd - Uncensorable AI Access via Nostr & Bitcoin",
    description:
      "The only tool you need for uncensorable access to AI. Powered by Nostr and Bitcoin.",
    url: "https://routstr.com/routstrd",
  },
  twitter: {
    title: "Routstrd - Uncensorable AI Access via Nostr & Bitcoin",
    description:
      "The only tool you need for uncensorable access to AI. Powered by Nostr and Bitcoin.",
  },
};

export default function RoutstrdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

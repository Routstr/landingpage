import type { Metadata } from "next";

const description =
  "What a typical request costs on every Routstr node, and which node apps send it to.";

export const metadata: Metadata = {
  title: "Node Prices - Routstr",
  description,
  openGraph: {
    title: "Node Prices - Routstr",
    description,
    url: "https://routstr.com/prices",
  },
  twitter: {
    title: "Node Prices - Routstr",
    description,
  },
};

export default function PricesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Routstr",
  description:
    "Updates, guides, and announcements from the Routstr team. Learn about decentralized AI, OpenClaw, and more.",
  openGraph: {
    title: "Blog - Routstr",
    description:
      "Updates, guides, and announcements from the Routstr team. Learn about decentralized AI, OpenClaw, and more.",
    url: "https://routstr.com/blog",
  },
  twitter: {
    title: "Blog - Routstr",
    description:
      "Updates, guides, and announcements from the Routstr team. Learn about decentralized AI, OpenClaw, and more.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

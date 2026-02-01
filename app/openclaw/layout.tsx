import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Setup - Run Your Own AI Agent",
  description:
    "Deploy your own OpenClaw AI agent in under 5 minutes with a single Bitcoin Lightning payment. Self-hosted, private, and powerful.",
  openGraph: {
    title: "OpenClaw Setup - Run Your Own AI Agent",
    description:
      "Deploy your own OpenClaw AI agent in under 5 minutes with a single Bitcoin Lightning payment.",
    url: "https://routstr.com/openclaw",
  },
  twitter: {
    title: "OpenClaw Setup - Run Your Own AI Agent",
    description:
      "Deploy your own OpenClaw AI agent in under 5 minutes with a single Bitcoin Lightning payment.",
  },
};

export default function OpenClawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingApiExample } from "@/components/landing/ApiExample";

export const metadata: Metadata = {
  title: "Capabilities & Integration",
  description:
    "OpenAI-compatible API, pay-per-request Bitcoin micropayments, decentralized Nostr discovery, simple deployment, and drop-in code integration.",
};

export default function CapabilitiesPage() {
  return (
    <SiteShell>
      <LandingFeatures />
      <LandingApiExample />
    </SiteShell>
  );
}

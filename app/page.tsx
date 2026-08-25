"use client";
import { SiteShell } from "@/components/layout/site-shell";
import { LandingHero } from "@/components/landing/Hero";
import { LandingNetworkGlobe } from "@/components/landing/NetworkGlobe";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingProducts } from "@/components/landing/Products";
import { LandingBrowseModels } from "@/components/landing/BrowseModels";
import { LandingTestimonials } from "@/components/landing/Testimonials";
import { LandingCTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <SiteShell useMain={false}>
      <LandingHero />
      <LandingNetworkGlobe />
      <LandingHowItWorks />
      <LandingProducts />
      <LandingBrowseModels />
      <LandingTestimonials />
      <LandingCTA />
    </SiteShell>
  );
}

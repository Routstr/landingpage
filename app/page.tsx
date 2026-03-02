"use client";
import { SiteShell } from "@/components/layout/site-shell";
import { LandingHero } from "@/components/landing/Hero";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingBrowseModels } from "@/components/landing/BrowseModels";
import { LandingTestimonials } from "@/components/landing/Testimonials";
import { LandingApiExample } from "@/components/landing/ApiExample";
import { LandingCTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <SiteShell useMain={false}>
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingApiExample />
      <LandingBrowseModels />
      <LandingTestimonials />
      <LandingCTA />
    </SiteShell>
  );
}

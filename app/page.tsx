"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// New Landing Components
import { LandingHero } from "@/components/landing/Hero";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingCTA } from "@/components/landing/CTA";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingBrowseModels } from "@/components/landing/BrowseModels";
import { LandingApiExample } from "@/components/landing/ApiExample";
import { LandingArchitecture } from "@/components/landing/Architecture";
import { LandingRoadmap } from "@/components/landing/Roadmap";
import { LandingTestimonials } from "@/components/landing/Testimonials";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      {/* Hero Section with animated globe and collision beams */}
      <LandingHero />
      
      {/* Features Section - bento grid with animated cards */}
      <section className="border-t border-white/5">
      <LandingFeatures />
      </section>

      {/* How It Works Section - for Users and Providers */}
      <section className="border-t border-white/5">
        <LandingHowItWorks />
      </section>

      {/* API Example Section - code snippets with language tabs */}
      <section className="border-t border-white/5">
        <LandingApiExample />
      </section>

      {/* Browse Models Section - model cards with pricing */}
      <section className="border-t border-white/5">
        <LandingBrowseModels />
      </section>

      {/* Testimonials Section - tweets from the community */}
      <section className="border-t border-white/5">
        <LandingTestimonials />
      </section>

      {/* Architecture Section - diagram and feature lists */}
      <section className="border-t border-white/5">
        <LandingArchitecture />
      </section>

      {/* Roadmap Section - timeline with status indicators */}
      <section className="border-t border-white/5">
        <LandingRoadmap />
      </section>

      {/* CTA Section */}
      <LandingCTA />

      <Footer />
    </main>
  );
}

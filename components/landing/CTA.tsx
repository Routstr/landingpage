"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
  return (
    <div className="w-full relative md:flex md:min-h-[calc(100svh-80px)] md:flex-col md:justify-center">
      <div className="w-full py-24 max-w-[1800px] mx-auto px-[clamp(1rem,5vw,5rem)] flex flex-col items-start text-left">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          Join the decentralized AI revolution
        </h2>
        <p className="text-muted-foreground text-base max-w-3xl leading-relaxed mb-10">
          Connect your models, monetize your hardware with Bitcoin micropayments, or build censorship-resistant AI apps using our open routing protocol.
        </p>
        
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex sm:gap-4">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/models">
              Explore Models
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="https://docs.routstr.com" target="_blank" rel="noreferrer">
              Read Docs
            </Link>
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

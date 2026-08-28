"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Testimonial {
  src: string;
  quote: React.ReactNode;
  name: string;
  handle: string;
  url: string;
  platform?: "x" | "nostr";
}

// Featured testimonial (Jack) leads the rotation
const featuredTestimonial: Testimonial = {
  name: "jack",
  handle: "@jack",
  quote: "nostr+bitcoin+ai routstr.com",
  src: "https://pbs.twimg.com/profile_images/1661201415899951105/azNjKOSH_400x400.jpg",
  url: "https://x.com/jack/status/1925607683454869946",
};

const testimonials: Testimonial[] = [
  {
    name: ".",
    handle: "npub1ak68...xy8fx",
    quote:
      "When you run your own routstr AI proxy on your own private vps, self host your own AI otrta chat client and send cashu from your own client to your own proxy to privately query AI over tor.",
    src: "https://image.nostr.build/338193e0b573539b3658205e7aa6810879857b431afff864ff3229421835c867.jpg",
    url: "https://nostr.eu/nevent1qqs24ymyjlp730qgf2nrj7utk3kf8m08xsrmftxdk5d60ln92tgsvvqzyrkmgup8z2t6cknp7fml8ng5me2vvl44enfqauxemu5muxrgtwcqgx6yq3l",
    platform: "nostr",
  },
  {
    name: "calle",
    handle: "npub12rv5...sf485vg",
    quote: (
      <span>
        This is incredible. AI chat pay per use. No accounts but instant and
        anonymous Bitcoin micro payments with Cashu.
        <br />
        <br />
        Try it with a tiny amount and see for yourself!
        <br />
        <br />
        routstr.com
      </span>
    ),
    src: "https://avatars.githubusercontent.com/u/93376500",
    url: "https://nostr.com/nevent1qqszj3rsayzeguyu02lfph63xm4lrh38el73yq37zsnhc6vrqq5tkxqzypgdjn7zmpvqc6ptqud9gtutrcc6yq9s2z96h9dr80hss4wl9qwkx0u6nyh",
    platform: "nostr",
  },
  {
    name: "d7r",
    handle: "@noD7R",
    quote:
      "very tru. eventually will find out routstr make all other services out there full of tracking and big noses... redundant",
    src: "https://unavatar.io/twitter/noD7R",
    url: "https://x.com/noD7R/status/1978063932913779068",
  },
  {
    name: "Avi Burra",
    handle: "avi@nip21.media",
    quote:
      "Yeah, sex is great, but have you ever tried inserting an ecash token instead of an API key and seeing it work? @routstr",
    src: "https://blossom.primal.net/c8b2a647585c707aa6fbe308f89ec0290b6e14963b0dd66bf39ba83bdb393f8c.gif",
    url: "https://nostr.com",
    platform: "nostr",
  },
  {
    name: "Kim Hudaya",
    handle: "@huedaya",
    quote: (
      <span>
        This could be the cheapest way to try a new LLM model via @roustrai +
        @CashuBTC + Grok CLI.
        <br />
        <br />
        1. Topup via Bitcoin Lightning to{" "}
        <code className="bg-border rounded px-1 py-0.5 font-mono text-xs">
          chat.routstr.com
        </code>{" "}
        (no fees, no login, can be less than $1)
        <br />
        2. Generate API key (Settings &gt; API Key)
        <br />
        3. Install Grok CLI and edit config{" "}
        <code className="bg-border rounded px-1 py-0.5 font-mono text-xs">
          nano ~/.grok/user-settings.json
        </code>
        <pre className="bg-background border border-border rounded p-3 mt-3 mb-3 font-mono text-[10px] overflow-x-auto text-foreground">
          {`{
  "apiKey": "sk-xxx",
  "baseURL": "api.routstr.com/v1",
  "defaultModel": "x-ai/grok-code-fast-1",
  "models": [
    "x-ai/grok-code-fast-1"
  ]
}`}
        </pre>
        The Grok CLI is still buggy, but the latency is not that bad.
      </span>
    ),
    src: "https://pbs.twimg.com/profile_images/1926804656933474304/WT6kN1nq_400x400.jpg",
    url: "https://x.com/huedaya/status/1968534848110485708",
  },
  {
    name: "Cashu",
    handle: "@CashuBTC",
    quote: (
      <span>
        With routstr, you can pay for AI services with Bitcoin using Cashu
        ecash.
        <br />
        <br />
        ✅ No signups
        <br />
        ✅ No credit cards
        <br />
        ✅ No KYC
        <br />
        <br />
        Want to know how it works? Check out our latest blog post blow!
      </span>
    ),
    src: "https://unavatar.io/twitter/CashuBTC",
    url: "https://x.com/CashuBTC/status/1978042521625231844",
  },
  {
    name: "Pavol Lupták",
    handle: "@wilderko",
    quote: (
      <span>
        A Decentralised LLM Routing Marketplace
        <br />
        <br />
        Permissionless, censorship-resistant AI routing powered by Nostr and
        Cashu
        <br />
        routstr.com
      </span>
    ),
    src: "https://pbs.twimg.com/profile_images/1293173311212486659/LnLz3tcC_400x400.jpg",
    url: "https://x.com/wilderko/status/1964961988200574995",
  },
  {
    name: "Vagabond Ⓜ️Ⓜ️ T $MMT",
    handle: "@Zhuaffa",
    quote: (
      <span>
        🧵 @routstrai – AI Power Without the Hassle
        <br />
        <br />
        <i>Freedom to Use AI, Your Way!</i>
        <br />
        <br />
        <b>1/ Introduction</b>
        <br />
        Hey everyone! Routstr is a cool new platform that makes using AI super
        easy and private. It&apos;s built on Nostr and Bitcoin, so you can access AI
        models without big companies watching you.
        <br />
        <br />
        Think of it as a marketplace where anyone can use or share AI tools
        securely.
      </span>
    ),
    src: "https://unavatar.io/twitter/Zhuaffa",
    url: "https://x.com/Zhuaffa/status/1929887531971293611",
  },
  {
    name: "Hamish MacEwan",
    handle: "@HamishMacEwan",
    quote: (
      <span>
        A Decentralised LLM Routing Marketplace
        <br />
        routstr.com
        <br />
        <br />
        Routstr brings the convenience of the OpenRouter experience to the
        permissionless, censorship-resistant world of Nostr and Bitcoin
      </span>
    ),
    src: "https://unavatar.io/twitter/HamishMacEwan",
    url: "https://x.com/HamishMacEwan/status/1952444259346636857",
  },
  {
    name: ".",
    handle: "npub1ak68...xy8fx",
    quote: (
      <span>
        My friends no longer understand what the hell I am talking about.
        <br />
        <br />
        &quot;I used zaps from nostr to buy a kyc free vps to run a routstr
        proxy that allows users to send me bitcoin using cashu to access my
        OpenAI api keys for private pay per query with llm models. It is
        interoperable with goose and dork which can be used with MKStack for one
        shot nostr vibe coding clients.&quot;
      </span>
    ),
    src: "https://image.nostr.build/338193e0b573539b3658205e7aa6810879857b431afff864ff3229421835c867.jpg",
    url: "https://nostr.com/nevent1qqsffzelsf83697t22j0s6z84jm96g6yehhuksa0qm9pe998e85lqyczyrkmgup8z2t6cknp7fml8ng5me2vvl44enfqauxemu5muxrgtwcqgy45jhh",
    platform: "nostr",
  },
];

function PlatformIcon({ platform }: { platform?: "x" | "nostr" }) {
  if (platform === "nostr") {
    // Nostr ostrich mark by SatsCoffee (github.com/satscoffee/nostr_icons).
    return (
      <svg viewBox="0 0 875 875" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="m684.72,485.57c.22,12.59-11.93,51.47-38.67,81.3-26.74,29.83-56.02,20.85-58.42,20.16s-3.09-4.46-7.89-3.77-9.6,6.17-18.86,7.2-17.49,1.71-26.06-1.37c-4.46.69-5.14.71-7.2,2.24s-17.83,10.79-21.6,11.47c0,7.2-1.37,44.57,0,55.89s3.77,25.71,7.54,36c3.77,10.29,2.74,10.63,7.54,9.94s13.37.34,15.77,4.11c2.4,3.77,1.37,6.51,5.49,8.23s60.69,17.14,99.43,19.2c26.74.69,42.86,2.74,52.12,19.54,1.37,7.89,7.54,13.03,11.31,14.06s8.23,2.06,12,5.83,1.03,8.23,5.49,11.66c4.46,3.43,14.74,8.57,25.37,13.71,10.63,5.14,15.09,13.37,15.77,16.11s1.71,10.97,1.71,10.97c0,0-8.91,0-10.97-2.06s-2.74-5.83-2.74-5.83c0,0-6.17,1.03-7.54,3.43s.69,2.74-7.89.69-11.66-3.77-18.17-8.57c-6.51-4.8-16.46-17.14-25.03-16.8,4.11,8.23,5.83,8.23,10.63,10.97s8.23,5.83,8.23,5.83l-7.2,4.46s-4.46,2.06-14.74-.69-11.66-4.46-12.69-10.63,0-9.26-2.74-14.4-4.11-15.77-22.29-21.26c-18.17-5.49-66.52-21.26-100.12-24.69s-22.63-2.74-28.11-1.37-15.77,4.46-26.4-1.37c-10.63-5.83-16.8-13.71-17.49-20.23s-1.71-10.97,0-19.2,3.43-19.89,1.71-26.74-14.06-55.89-19.89-64.12c-13.03,1.03-50.74-.69-50.74-.69,0,0-2.4-.69-17.49,5.83s-36.48,13.76-46.77,19.93-14.4,9.7-16.12,13.13c.12,3-1.23,7.72-2.79,9.06s-12.48,2.42-12.48,2.42c0,0-5.85,5.86-8.25,9.97-6.86,9.6-55.2,125.14-66.52,149.83-13.54,32.57-9.77,27.43-37.71,27.43s-8.06.3-8.06.3c0,0-12.34,5.88-16.8,5.88s-18.86-2.4-26.4,0-16.46,9.26-23.31,10.29-4.95-1.34-8.38-3.74c-4-.21-14.27-.12-14.27-.12,0,0,1.74-6.51,7.91-10.88,8.23-5.83,25.37-16.11,34.63-21.26s17.49-7.89,23.31-9.26,18.51-6.17,30.51-9.94,19.54-8.23,29.83-31.54c10.29-23.31,50.4-111.43,51.43-116.23.63-2.96,3.73-6.48,4.8-15.09.66-5.35-2.49-13.04,1.71-22.63,10.97-25.03,21.6-20.23,26.4-20.23s17.14.34,26.4-1.37,15.43-2.74,24.69-7.89,11.31-8.91,11.31-8.91l-19.89-3.43s-18.51.69-25.03-4.46-15.43-15.77-15.43-15.77l-7.54-7.2,1.03,8.57s-5.14-8.91-6.51-10.29-8.57-6.51-11.31-11.31-7.54-25.03-7.54-25.03l-6.17,13.03-1.71-18.86-5.14,7.2-2.74-16.11-4.8,8.23-3.43-14.4-5.83,4.46-2.4-10.29-5.83-3.43s-14.06-9.26-16.46-9.6-4.46,3.43-4.46,3.43l1.37,12-12.2-6.27-7-11.9s2.36,4.01-9.62,7.53c-20.55,0-21.89-2.28-24.93-3.94-1.31-6.56-5.57-10.11-5.57-10.11h-20.57l-.34-6.86-7.89,3.09.69-10.29h-14.06l1.03-11.31h-8.91s3.09-9.26,25.71-22.97,25.03-16.46,46.29-17.14c21.26-.69,32.91,2.74,46.29,8.23s38.74,13.71,43.89,17.49c11.31-9.94,28.46-19.89,34.29-19.89,1.03-2.4,6.19-12.33,17.96-17.6,35.31-15.81,108.13-34,131.53-35.54,31.2-2.06,7.89-1.37,39.09,2.06,31.2,3.43,54.17,7.54,69.6,12.69,12.58,4.19,25.03,9.6,34.29,2.06,4.33-1.81,11.81-1.34,17.83-5.14,30.69-25.09,34.72-32.35,43.63-41.95s20.14-24.91,22.54-45.14,4.46-58.29-10.63-88.12-28.8-45.26-34.63-69.26c-5.83-24-8.23-61.03-6.17-73.03,2.06-12,5.14-22.29,6.86-30.51s9.94-14.74,19.89-16.46c9.94-1.71,17.83,1.37,22.29,4.8,4.46,3.43,11.65,6.28,13.37,10.29.34,1.71-1.37,6.51,8.23,8.23,9.6,1.71,16.05,4.16,16.05,4.16,0,0,15.64,4.29,3.11,7.73-12.69,2.06-20.52-.71-24.29,1.69s-7.21,10.08-9.61,11.1-7.2.34-12,4.11-9.6,6.86-12.69,14.4-5.49,15.77-3.43,26.74,8.57,31.54,14.4,43.2c5.83,11.66,20.23,40.8,24.34,47.66s15.77,29.49,16.8,53.83,1.03,44.23,0,54.86-10.84,51.65-35.53,85.94c-8.16,14.14-23.21,31.9-24.67,35.03-1.45,3.13-3.02,4.88-1.61,7.65,4.62,9.05,12.87,22.13,14.71,29.22,2.29,6.64,6.99,16.13,7.22,28.72Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// The right margin, rather than a flex gap, keeps each card the same width as
// its trailing space so a -50% shift on the duplicated track loops seamlessly.
function MarqueeCard({
  testimonial,
  duplicate = false,
}: {
  testimonial: Testimonial;
  duplicate?: boolean;
}) {
  return (
    <Link
      href={testimonial.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      className="group mr-5 flex w-[300px] shrink-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 sm:w-[340px]"
    >
      <div className="line-clamp-5 text-xs leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] md:text-sm">
        {testimonial.quote}
      </div>
      <div className="mt-5 flex min-w-0 items-center gap-3 border-t border-border pt-4">
        <Image
          src={testimonial.src}
          alt=""
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
          loading="lazy"
          unoptimized={testimonial.src.endsWith(".gif")}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-bold text-foreground">
            {testimonial.name}
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {testimonial.handle}
          </span>
        </div>
        <span className="ml-auto shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground">
          <PlatformIcon platform={testimonial.platform} />
        </span>
      </div>
    </Link>
  );
}

function MarqueeRow({
  items,
  direction,
  duration,
}: {
  items: Testimonial[];
  direction: "left" | "right";
  duration: string;
}) {
  return (
    <div className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={cn(
          "flex w-max items-stretch py-1",
          direction === "left" ? "marquee-track-left" : "marquee-track-right"
        )}
        style={{ "--marquee-duration": duration } as React.CSSProperties}
      >
        {items.map((testimonial, index) => (
          <MarqueeCard key={`a-${index}`} testimonial={testimonial} />
        ))}
        {items.map((testimonial, index) => (
          <MarqueeCard key={`b-${index}`} testimonial={testimonial} duplicate />
        ))}
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  const [rowOne, rowTwo] = [testimonials.slice(0, 5), testimonials.slice(5)];

  return (
    <div className="w-full relative py-20 md:flex md:min-h-[calc(100svh-80px)] md:flex-col md:justify-center">
      <div className="mx-auto w-full max-w-[1800px] px-[clamp(1rem,5vw,5rem)]">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Community
        </p>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          What people are saying
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Join the growing community embracing privacy-first AI access
        </p>

        <Link
          href={featuredTestimonial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative mx-auto mt-12 block w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-8 text-center hover:border-foreground/20 md:p-10"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-7 left-5 select-none font-mono text-[7rem] leading-none text-foreground/[0.05]"
          >
            &ldquo;
          </span>
          <p className="relative text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {featuredTestimonial.quote}
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3">
            <Image
              src={featuredTestimonial.src}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
              loading="lazy"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-foreground">
                {featuredTestimonial.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {featuredTestimonial.handle}
              </span>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
        </Link>
      </div>

      <div className="mt-12 flex flex-col gap-5">
        <MarqueeRow items={rowOne} direction="left" duration="60s" />
        <MarqueeRow items={rowTwo} direction="right" duration="75s" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

export default LandingTestimonials;

"use client";

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
  image?: string;
}

// Featured testimonial for the center column (Jack)
const featuredTestimonial: Testimonial = {
  name: "jack",
  handle: "@jack",
  quote: "nostr+bitcoin+ai routstr.com",
  src: "https://pbs.twimg.com/profile_images/1661201415899951105/azNjKOSH_400x400.jpg",
  url: "https://x.com/jack/status/1925607683454869946",
};

const testimonials: Testimonial[] = [
  // Column 1
  {
    name: ".",
    handle: "npub1ak68...xy8fx",
    quote:
      "When you run your own routstr AI proxy on your own private vps, self host your own AI otrta chat client and send cashu from your own client to your own proxy to privately query AI over tor.",
    src: "https://image.nostr.build/338193e0b573539b3658205e7aa6810879857b431afff864ff3229421835c867.jpg",
    url: "https://nostr.eu/nevent1qqs24ymyjlp730qgf2nrj7utk3kf8m08xsrmftxdk5d60ln92tgsvvqzyrkmgup8z2t6cknp7fml8ng5me2vvl44enfqauxemu5muxrgtwcqgx6yq3l",
    platform: "nostr",
    image:
      "https://image.nostr.build/34d84344a679f3cd9b6a9cc18b354e5eb38bb2c4d2f1c9791f969b19029b546f.png",
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
    src: "https://pbs.twimg.com/profile_images/1987245450580066304/VYxT1glH_400x400.jpg",
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

  // Column 2
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

  // Column 3
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

function FeaturedTestimonialCard({ className }: { className?: string }) {
  return (
    <Link
      href={featuredTestimonial.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block min-w-0 overflow-hidden rounded border border-border bg-muted p-6 transition-colors duration-300 group hover:bg-muted hover:border-border",
        className
      )}
    >
      <h3 className="text-base font-bold text-foreground py-2 mb-2">
        {featuredTestimonial.quote}
      </h3>
      <div className="flex gap-3 items-center">
        <Image
          src={featuredTestimonial.src}
          alt={featuredTestimonial.name}
          width={40}
          height={40}
          className="rounded-sm"
          loading="lazy"
        />
        <div className="flex flex-col">
          <span className="font-bold text-sm text-foreground">
            {featuredTestimonial.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {featuredTestimonial.handle}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function LandingTestimonials() {
  const col1 = testimonials.slice(0, 4);
  const col2Rest = testimonials.slice(4, 7);
  const col3 = testimonials.slice(7, 10);

  return (
    <div className="w-full px-6 md:px-12 py-20 max-w-5xl mx-auto relative">
      <h2 className="text-xl font-bold text-foreground mb-2">
        What people are saying
      </h2>
      <p className="text-muted-foreground text-sm mb-12 max-w-xl">
        Join the growing community embracing privacy-first AI access
      </p>
      <FeaturedTestimonialCard className="mb-6 md:hidden" />

      <div className="grid min-w-0 grid-cols-1 gap-6 items-start md:grid-cols-2 lg:grid-cols-3">
        {/* Column 1 */}
        <div className="grid min-w-0 gap-6 items-start">
          {col1.map((testimonial, idx) => (
            <Card key={`col1-${idx}`} url={testimonial.url}>
              <Quote>{testimonial.quote}</Quote>
              {testimonial.image && (
                <div className="mt-4 rounded border border-border overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt="Attached image"
                    width={500}
                    height={300}
                    className="w-full h-auto opacity-80"
                    loading="lazy"
                  />
                </div>
              )}
              <TestimonialFooter testimonial={testimonial} />
            </Card>
          ))}
        </div>

        {/* Column 2 - Jack featured at top */}
        <div className="grid min-w-0 gap-6 items-start">
          <FeaturedTestimonialCard className="hidden md:block" />

          {/* Rest of column 2 */}
          {col2Rest.map((testimonial, idx) => (
            <Card key={`col2-${idx}`} url={testimonial.url}>
              <Quote>{testimonial.quote}</Quote>
              {testimonial.image && (
                <div className="mt-4 rounded border border-border overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt="Attached image"
                    width={500}
                    height={300}
                    className="w-full h-auto opacity-80"
                  />
                </div>
              )}
              <TestimonialFooter testimonial={testimonial} />
            </Card>
          ))}
        </div>

        {/* Column 3 */}
        <div className="grid min-w-0 gap-6 items-start">
          {col3.map((testimonial, idx) => (
            <Card key={`col3-${idx}`} url={testimonial.url}>
              <Quote>{testimonial.quote}</Quote>
              {testimonial.image && (
                <div className="mt-4 rounded border border-border overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt="Attached image"
                    width={500}
                    height={300}
                    className="w-full h-auto opacity-80"
                  />
                </div>
              )}
              <TestimonialFooter testimonial={testimonial} />
            </Card>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

function TestimonialFooter({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex gap-3 items-center mt-6">
      <Image
        src={testimonial.src}
        alt={testimonial.name}
        width={32}
        height={32}
        className="rounded-sm"
        loading="lazy"
        unoptimized={testimonial.src.endsWith(".gif")}
      />
      <div className="flex flex-col">
        <QuoteDescription className="font-bold text-foreground">
          {testimonial.name}
        </QuoteDescription>
        <QuoteDescription className="text-muted-foreground">
          {testimonial.handle}
        </QuoteDescription>
      </div>
    </div>
  );
}

const Card = ({
  className,
  children,
  url,
}: {
  className?: string;
  children: React.ReactNode;
  url: string;
}) => {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block min-w-0 overflow-hidden rounded border border-border bg-card p-5 transition-colors duration-300 group hover:bg-muted hover:border-border",
        className
      )}
    >
      {children}
    </Link>
  );
};

const Quote = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3
      className={cn(
        "relative mb-4 text-xs font-normal leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto md:text-sm",
        className
      )}
    >
      {children}
    </h3>
  );
};

const QuoteDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p
      className={cn("text-[10px] sm:text-xs max-w-sm truncate", className)}
    >
      {children}
    </p>
  );
};

export default LandingTestimonials;

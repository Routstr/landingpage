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
    name: "calle",
    handle: "npub12rv5...sf485vg",
    quote: (
      <span>
        AI (intelligence) + Nostr (distributed) + Cashu (anonymous) + Bitcoin
        (permissionless)
        <br />
        <br />
        routstr.com
      </span>
    ),
    src: "https://avatars.githubusercontent.com/u/93376500",
    url: "https://nostr.ae/nevent1qqsv9vtxwanl8g47jpcs8jd03ukpc8jr5a5wvahufrv2lvg8h583dggpzemhxue69uhhyetvv9ujumn0wd68ytnzv9hxgqg0waehxw309ahx7tnnw3ezucmjqy8hwumn8ghj7mn0wd68ytnddakszrthwden5te0dehhxtnvdakqzxrhwden5te0wfjkccte9eekummjwsh8xmmrd9skcqg5waehxw309aex2mrp0yhxgctdw4eju6t0qxd8wumn8ghj7mn0wvhxcmmv9ujnyvrhwden5te0dehhxarj9ekxzmny9ujnyvp9xgcxzanpw3shyffjxpmhxue69uhkummnw3ezuamfdejj7ffjxqjnyvrpweshgctjy5erqamnwvaz7tmsw4e8qmr9wfjkccte9e3k7mf0y5erqamnwvaz7tmjv4kxz7fwv3sk6atn9e5k7te9xgc8wumn8ghj7un9d3shjtnndehhyapwwdhkx6tpdsq3camnwvaz7tmwdaehgu3wvf5hgcm0d9hx2u3wwdhkx6tpdspzq5xeflpdskqvdq4swxj59793uvdzqzc9pzatjk3nhmcg2h0js8trqnvrak",
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
        <code className="bg-white/10 rounded px-1 py-0.5 font-mono text-sm">
          chat.routstr.com
        </code>{" "}
        (no fees, no login, can be less than $1)
        <br />
        2. Generate API key (Settings &gt; API Key)
        <br />
        3. Install Grok CLI and edit config{" "}
        <code className="bg-white/10 rounded px-1 py-0.5 font-mono text-sm">
          nano ~/.grok/user-settings.json
        </code>
        <pre className="bg-neutral-950/50 border border-white/10 rounded p-3 mt-3 mb-3 font-mono text-xs overflow-x-auto">
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
    name: "calle",
    handle: "npub12rv5...sf485vg",
    quote: (
      <span>
        wallet mnemonic -&gt; nsec/npub -&gt; backup metadata on nostr
        <br />
        <br />
        don&apos;t sleep on nostr
      </span>
    ),
    src: "https://avatars.githubusercontent.com/u/93376500",
    url: "https://nostr.com/nevent1qqsvc6qpss40mqhpzsjy9ghcug8xrcvl5kyws5rmk9d9u7kqpcx93lcppamhxue69uhkummnw3ezumt0d5qs6amnwvaz7tmwdaejumr0dspzq5xeflpdskqvdq4swxj59793uvdzqzc9pzatjk3nhmcg2h0js8trrjh2ta",
    platform: "nostr",
  },
  {
    name: "Cashu",
    handle: "@CashuBTC",
    quote: (
      <span>
        With routstr, you can pay for AI services with Bitcoin using Cashu ecash.
        <br />
        <br />
        ✅ No signups
        <br />
        <br />
        ✅ No credit cards
        <br />
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
        <br />
        Hey everyone! Routstr is a cool new platform that makes using AI super
        easy and private. It's built on Nostr and Bitcoin, so you can access AI
        models without big companies watching you.
        <br />
        <br />
        Think of it as a marketplace where anyone can use or share AI tools
        securely, launched in 2025 to bring AI freedom to all!
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

export function LandingTestimonials() {
  const first = testimonials.slice(0, 4);
  const second = testimonials.slice(4, 8);
  const third = testimonials.slice(8, 11);

  const grid = [first, second, third];
  
  return (
    <div className="py-20 max-w-7xl mx-auto px-4 md:px-8">
      <h2
        className={cn(
          "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white sm:text-center"
        )}
      >
        What People Are Saying
      </h2>
      <p
        className={cn(
          "mt-4 text-base md:text-lg lg:text-xl text-neutral-400 sm:text-center"
        )}
      >
        Join the growing community embracing privacy-first AI access
      </p>

      {/* Featured testimonial - Jack */}
      <div className="flex justify-center mt-12">
        <Link
          href={featuredTestimonial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-8 rounded-2xl border border-white/10 relative bg-neutral-900/50 hover:bg-neutral-900/80 hover:border-white/20 transition-all duration-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] max-w-md w-full group"
        >
          <h3 className="text-xl md:text-2xl font-medium text-white py-2 text-center">
            {featuredTestimonial.quote}
          </h3>
          <div className="flex gap-3 items-center justify-center mt-6">
            <Image
              src={featuredTestimonial.src}
              alt={featuredTestimonial.name}
              width={48}
              height={48}
              className="rounded-full ring-2 ring-white/10"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-white text-base">
                {featuredTestimonial.name}
              </span>
              <span className="text-sm text-neutral-400">
                {featuredTestimonial.handle}
              </span>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-neutral-500 ml-2"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12 items-start">
        {grid.map((testimonialsCol, index) => (
          <div
            key={`testimonials-col-${index}`}
            className="grid gap-4 items-start"
          >
            {testimonialsCol.map((testimonial, idx) => (
              <Card
                key={`testimonial-${testimonial.name}-${idx}`}
                url={testimonial.url}
              >
                <Quote>{testimonial.quote}</Quote>
                {testimonial.image && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
                    <Image
                      src={testimonial.image}
                      alt="Attached image"
                      width={500}
                      height={300}
                      className="w-full h-auto"
                    />
                  </div>
                )}
                <div className="flex gap-3 items-center mt-6">
                  <Image
                    src={testimonial.src}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="flex flex-col">
                    <QuoteDescription className="font-semibold text-white">
                      {testimonial.name}
                    </QuoteDescription>
                    <QuoteDescription className="text-[11px]">
                      {testimonial.handle}
                    </QuoteDescription>
                  </div>
                  {/* Platform Logo */}
                  <div className="ml-auto">
                    {testimonial.platform === "nostr" ? (
                      <svg
                        viewBox="0 0 620 620"
                        className="w-5 h-5 text-neutral-600"
                        fill="currentColor"
                      >
                        <path d="M620 270.227V597.655C620 609.968 610.081 619.961 597.859 619.961H332.161C319.938 619.961 310.02 609.968 310.02 597.655V536.678C311.23 461.931 319.079 390.332 335.558 357.759C345.438 338.168 361.722 327.506 380.427 321.802C415.768 311.102 477.779 318.419 504.099 317.16C504.099 317.16 583.605 320.346 583.605 274.987C583.605 238.48 548.07 241.352 548.07 241.352C508.902 242.374 479.068 239.699 459.738 232.028C427.365 219.203 426.272 195.678 426.155 187.81C424.554 96.934 291.549 86.0368 174.359 108.579C46.2354 133.127 175.765 318.143 175.765 565.121V598.088C175.531 610.204 165.807 620 153.702 620H22.1415C9.91874 620 0 610.008 0 597.694V31.3934C0 19.08 9.91874 9.08757 22.1415 9.08757H145.813C158.036 9.08757 167.955 19.08 167.955 31.3934C167.955 49.6866 188.378 59.8756 203.139 49.2145C247.617 17.113 304.709 0 368.595 0C511.714 0 619.922 84.0305 619.922 270.227H620ZM382.419 203.782C382.419 177.424 361.214 156.062 335.051 156.062C308.887 156.062 287.683 177.424 287.683 203.782C287.683 230.14 308.887 251.501 335.051 251.501C361.214 251.501 382.419 230.14 382.419 203.782Z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 text-neutral-600"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
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
        "block p-6 rounded-xl border border-white/10 relative bg-neutral-900/50 hover:bg-neutral-900/80 hover:border-white/20 transition-all duration-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] group",
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
        "text-base md:text-lg font-normal text-white py-2 relative",
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
      className={cn(
        "text-xs font-normal text-neutral-400 max-w-sm",
        className
      )}
    >
      {children}
    </p>
  );
};

export default LandingTestimonials;

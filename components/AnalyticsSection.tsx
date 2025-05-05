import Image from 'next/image';

interface AnalyticsSectionProps {
  title: string;
  description: string;
  className?: string;
}

export default function AnalyticsSection({
  title,
  description,
  className = ''
}: AnalyticsSectionProps) {
  return (
    <section id="architecture" className={`bg-black py-20 ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            {title}
          </h2>
          <p className="mb-12 text-xl text-gray-300">{description}</p>
        </div>

        <div className="mx-auto max-w-4xl p-6 rounded-lg border border-white/10 bg-black font-mono text-xs text-gray-400">
          <div className="flex justify-center">
            {/* Desktop/Tablet: show architecture.svg, Mobile: show architecture-mobile.svg */}
            <div className="hidden sm:block w-full">
              <Image
                src="/assets/architecture.svg"
                alt="Architecture diagram"
                width={900}
                height={185}
                className="w-full h-auto max-w-3xl"
                priority
              />
            </div>
            <div className="block sm:hidden w-full">
              <Image
                src="/assets/architecture-mobile.svg"
                alt="Architecture diagram (mobile)"
                width={350}
                height={350}
                className="w-full h-auto max-w-xs"
                priority
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded bg-white/5 border border-white/10">
              <h3 className="text-white mb-2 font-medium">Smart Client SDK</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Automatic provider selection</li>
                <li>Privacy routing via Tor</li>
                <li>Cashu token cycling</li>
                <li>Drop-in OpenAI compatibility</li>
              </ul>
            </div>

            <div className="p-4 rounded bg-white/5 border border-white/10">
              <h3 className="text-white mb-2 font-medium">Self-Hosted Proxy</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Works with any OpenAI-compatible server</li>
                <li>Accepts Cashu and BOLT12 payments</li>
                <li>Secure rate limiting</li>
                <li>Optional Tor Hidden Service mode</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 
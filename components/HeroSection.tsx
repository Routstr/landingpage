import Link from "next/link";
import { useNostr } from '@/context/NostrContext';

interface HeroSectionProps {
  title: string;
  description: string;
  footerText?: string;
  className?: string;
}

export default function HeroSection({
  title,
  description,
  footerText = 'Open Source • GNU General Public License v3.0 • Permissionless',
  className = ''
}: HeroSectionProps) {
  const { isAuthenticated } = useNostr();

  return (
    <section className={`bg-black py-20 relative overflow-hidden w-full ${className}`}>
      {/* Tech grid background effect */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="grid grid-cols-12 h-full w-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border border-white/10"></div>
          ))}
        </div>
      </div>
      
      <div className="px-4 md:px-6 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-block mb-3 px-3 py-1 bg-white/10 text-white rounded-full text-sm font-mono">
            Powered by Nostr + Bitcoin
          </div>
          <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl text-white">
            {title}
          </h1>
          <p className="mb-8 text-xl text-gray-300">{description}</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {isAuthenticated ? (
              <>
                <Link href="/chat" className="inline-flex h-10 items-center justify-center rounded-md bg-white text-black px-8 text-sm font-medium transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white">
                  Try AI Chat
                </Link>
                <Link href="/settings" className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 bg-black/50 px-8 text-sm font-medium text-white transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30">
                  Wallet Settings
                </Link>
              </>
            ) : (
              <>
                <Link href="/settings" className="inline-flex h-10 items-center justify-center rounded-md bg-white text-black px-8 text-sm font-medium transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white">
                  Start Using Now
                </Link>
                <Link href="/docs" className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 bg-black/50 px-8 text-sm font-medium text-white transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30">
                  View Documentation
                </Link>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-center text-xs text-gray-500 mb-2">
            <code className="font-mono mr-2 px-2 py-1 rounded bg-black border border-white/10">docker run -p 8080:8080 ghcr.io/routstr/proxy</code>
          </div>
          
          {footerText && <p className="text-sm text-gray-400 font-mono">{footerText}</p>}
        </div>
      </div>
    </section>
  );
} 
import Link from "next/link";
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
  return (
    <section className={`bg-black py-12 sm:py-16 md:py-20 relative overflow-hidden w-full ${className}`}>
      <div className="px-4 md:px-6 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-block mb-3 px-3 py-1 bg-white/10 text-white rounded-full text-xs font-mono">
            Powered by Nostr + Bitcoin
          </div>
          <h1 className="mb-4 sm:mb-6 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {title}
          </h1>
          <p className="mb-6 sm:mb-8 text-base sm:text-xl text-gray-300">{description}</p>

          <div className="flex flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
            <Link href="/models" className="inline-flex h-10 items-center justify-center rounded-md bg-white text-black px-6 sm:px-8 text-sm font-medium transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer">
              Explore Models
            </Link>
            <Link
              href="chat.routstr.com"
              className="inline-flex h-10 items-center justify-center rounded-md bg-amber-400 text-black px-6 sm:px-8 text-sm font-medium transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              Chat now
            </Link>
          </div>

          <div className="flex items-center justify-center text-xs text-gray-500 mb-2 overflow-x-auto">
            <code className="font-mono mr-2 px-2 py-1 rounded bg-black border border-white/10 whitespace-nowrap text-xs">docker run -p 8080:8080 ghcr.io/routstr/proxy</code>
          </div>

          {footerText && <p className="text-xs text-gray-400 font-mono overflow-hidden text-ellipsis">{footerText}</p>}
        </div>
      </div>
    </section>
  );
} 
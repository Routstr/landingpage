import Link from 'next/link';
import { RoutstrMark } from '@/components/RoutstrMark';

type FooterLink = {
  text: string;
  href: string;
  external?: boolean;
};

export default function Footer() {
  const exploreLinks: FooterLink[] = [
    { text: 'Models', href: '/models' },
    { text: 'Providers', href: '/providers' },
    { text: 'Stats', href: '/stats' },
    { text: 'Top-Up', href: '/topup' },
    { text: 'Blog', href: '/blog' },
    { text: 'Roadmap', href: '/roadmap' },
  ];

  const developerLinks: FooterLink[] = [
    { text: 'Chat', href: 'https://chat.routstr.com', external: true },
    { text: 'Docs', href: 'https://docs.routstr.com', external: true },
    { text: 'GitHub', href: 'https://github.com/routstr', external: true },
  ];

  const communityLinks: FooterLink[] = [
    { text: 'Nostr', href: 'https://njump.me/npub130mznv74rxs032peqym6g3wqavh472623mt3z5w73xq9r6qqdufs7ql29s', external: true },
    { text: 'X', href: 'https://x.com/routstrai', external: true },
  ];

  return (
    <div className="w-full border-t border-border bg-transparent px-4 py-16 font-mono sm:px-[clamp(1rem,5vw,5rem)] md:py-24">
      <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-12 md:flex-row md:gap-16">
        {/* Logo and copyright */}
        <div className="flex-1">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
            <RoutstrMark className="h-6 w-6 shrink-0 text-foreground" />
            <span className="text-base font-medium tracking-[0.28em] text-foreground">ROUTSTR</span>
          </Link>
          <div className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            The open source protocol for decentralized AI inference routing.
          </div>
          <div className="mt-8 text-[10px] font-bold text-muted-foreground">
            &copy; {new Date().getFullYear()} Routstr.
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-20">
          {/* Explore */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-muted-foreground">Explore</h4>
            <ul className="space-y-4 text-xs">
              {exploreLinks.map((link, idx) => (
                <li key={idx}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      {link.text}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-muted-foreground">Developers</h4>
            <ul className="space-y-4 text-xs">
              {developerLinks.map((link, idx) => (
                <li key={idx}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      {link.text}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-muted-foreground hover:text-foreground transition-colors">
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold text-muted-foreground">Community</h4>
            <ul className="space-y-4 text-xs">
              {communityLinks.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Large brand lockup */}
      <div className="pointer-events-none mx-auto mt-16 flex max-w-[1800px] select-none items-center justify-center gap-4 overflow-hidden md:mt-32 md:gap-8">
        <RoutstrMark className="h-[2.4rem] w-[2.4rem] shrink-0 text-card sm:h-[4.8rem] sm:w-[4.8rem] md:h-[8rem] md:w-[8rem] lg:h-[9.6rem] lg:w-[9.6rem]" />
        <span className="block text-[3rem] font-bold leading-none tracking-tighter text-card sm:text-[6rem] md:text-[10rem] lg:text-[12rem]">
          ROUTSTR
        </span>
      </div>
    </div>
  );
}

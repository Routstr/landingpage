import Link from 'next/link';

export default function Footer() {
  const productLinks = [
    { text: 'Models', href: '/models' },
    { text: 'Providers', href: '/providers' },
    { text: 'Top-Up', href: '/topup', external: true },
    { text: 'Roadmap', href: '/roadmap' },
  ];

  const resourcesLinks = [
    { text: 'Docs', href: 'https://docs.routstr.com', external: true },
    { text: 'Blog', href: '/blog' },
    { text: 'Chat', href: 'https://chat.routstr.com', external: true },
    { text: 'GitHub', href: 'https://github.com/routstr', external: true },
  ];

  const socialLinks = [
    { text: 'Nostr', href: 'https://njump.me/npub130mznv74rxs032peqym6g3wqavh472623mt3z5w73xq9r6qqdufs7ql29s', external: true },
    { text: 'Twitter', href: 'https://x.com/routstrai', external: true },
  ];

  const legalLinks = [
    { text: 'Terms', href: '/terms' },
    { text: 'Privacy', href: '/privacy' },
  ];

  return (
    <section className="bg-black border-t border-white/10 py-16 w-full">
      <div className="px-4 md:px-6 max-w-5xl mx-auto">
        <footer>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2 mb-2 lg:mb-0">
              <div className="flex items-center gap-2 lg:justify-start">
                <Link href="/" className="flex items-center">
                  <span className="text-lg sm:text-xl font-bold text-white">Routstr</span>
                </Link>
              </div>
              <p className="mt-4 text-xs sm:text-sm text-gray-400">Decentralized LLM routing marketplace</p>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-white">Product</h3>
              <ul className="space-y-3">
                {productLinks.map((link) => (
                  <li key={link.text} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                        {link.text}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                        </svg>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link href={link.href}>{link.text}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-white">Resources</h3>
              <ul className="space-y-3">
                {resourcesLinks.map((link) => (
                  <li key={link.text} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                        {link.text}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                        </svg>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link href={link.href}>{link.text}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-white">Social</h3>
              <ul className="space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.text} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                      {link.text}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                      </svg>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            
          </div>

          <div className="text-gray-400 mt-16 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-sm font-medium md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} Routstr. Licensed under GNU General Public License v3.0</p>
            <ul className="flex gap-4">
              {legalLinks.map((link) => (
                <li key={link.text} className="hover:text-white">
                  <Link href={link.href}>{link.text}</Link>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
}
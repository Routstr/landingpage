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
    { text: 'X', href: 'https://x.com/routstrai', external: true },
  ];

  return (
    <div className="border-t border-white/[0.1] px-4 md:px-8 py-20 bg-black w-full relative overflow-hidden">
      <div className="max-w-7xl mx-auto text-sm text-neutral-500 flex sm:flex-row flex-col justify-between items-start">
        {/* Logo and copyright */}
        <div>
          <div className="mr-0 md:mr-4 md:flex mb-4">
            <Link
              href="/"
              className="font-normal flex space-x-2 items-center text-sm mr-4 relative z-20"
            >
              <span className="font-bold text-xl md:text-2xl text-white">Routstr</span>
            </Link>
          </div>
          <div className="mt-2 text-neutral-400">
            The Open Protocol for AI Access
          </div>
          <div className="mt-4 text-neutral-500">
            &copy; {new Date().getFullYear()} Routstr. All rights reserved.
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 items-start mt-10 sm:mt-0 md:mt-0">
          {/* Product */}
          <div className="flex justify-center space-y-4 flex-col w-full">
            <p className="text-neutral-300 font-bold">
              Product
            </p>
            <ul className="text-neutral-400 list-none space-y-4">
              {productLinks.map((link, idx) => (
                <li key={"product" + idx} className="list-none">
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white inline-flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <Link
                      className="transition-colors hover:text-white"
                      href={link.href}
                    >
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="flex justify-center space-y-4 flex-col">
            <p className="text-neutral-300 font-bold">
              Resources
            </p>
            <ul className="text-neutral-400 list-none space-y-4">
              {resourcesLinks.map((link, idx) => (
                <li key={"resource" + idx} className="list-none">
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white inline-flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <Link
                      className="transition-colors hover:text-white"
                      href={link.href}
                    >
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="flex justify-center space-y-4 flex-col">
            <p className="text-neutral-300 font-bold">
              Social
            </p>
            <ul className="text-neutral-400 list-none space-y-4">
              {socialLinks.map((link, idx) => (
                <li key={"social" + idx} className="list-none">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white inline-flex items-center gap-1"
                  >
                    {link.text}
                    <ExternalLinkIcon />
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Large brand text */}
      <p className="text-center mt-20 text-5xl md:text-9xl lg:text-[12rem] xl:text-[13rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 to-neutral-800 inset-x-0 select-none pointer-events-none">
        Routstr
      </p>
    </div>
  );
}

const ExternalLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    className="w-3 h-3 opacity-50"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 7L7 17M17 7h-6m6 0v6"
    />
  </svg>
);

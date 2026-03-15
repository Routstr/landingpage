"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

type MenuLink = {
  title: string;
  href: string;
  description: string;
  external?: boolean;
};

type MenuGroup = {
  title: string;
  links: MenuLink[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "Explore",
    links: [
      {
        title: "Models",
        href: "/models",
        description: "Browse the live model catalog across the network.",
      },
      {
        title: "Providers",
        href: "/providers",
        description: "Inspect nodes, operators, and endpoint details.",
      },
      {
        title: "Stats",
        href: "/stats",
        description: "Track usage, pricing, and network activity.",
      },
    ],
  },
  {
    title: "Products",
    links: [
      {
        title: "Top-Up",
        href: "/topup",
        description: "Fund an API key with Cashu or Lightning.",
      },
      {
        title: "Chat",
        href: "https://chat.routstr.com",
        description: "Use Routstr through the hosted chat client.",
        external: true,
      },
      {
        title: "Platform",
        href: "https://beta.platform.routstr.com",
        description: "Manage keys, wallets, and node workflows.",
        external: true,
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        title: "Blog",
        href: "/blog",
        description: "Read product notes, guides, and release posts.",
      },
      {
        title: "Roadmap",
        href: "/roadmap",
        description: "See the current protocol and frontend direction.",
      },
      {
        title: "Docs",
        href: "https://docs.routstr.com",
        description: "Implementation guides and API references.",
        external: true,
      },
      {
        title: "GitHub",
        href: "https://github.com/routstr",
        description: "Source code, issues, and releases.",
        external: true,
      },
    ],
  },
];

function MenuPanel({ links }: { links: MenuLink[] }) {
  return (
    <ul className="grid w-full gap-2 p-3">
      {links.map((link) => (
        <li key={link.title}>
          <NavigationMenuLink asChild>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full min-w-0 flex-col gap-2 border border-transparent bg-background px-4 py-3 transition-colors hover:border-border hover:bg-muted/40 focus:outline-none"
              >
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  {link.title}
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </span>
                <span className="min-w-0 whitespace-normal break-words text-xs leading-relaxed text-muted-foreground">
                  {link.description}
                </span>
              </a>
            ) : (
              <Link
                href={link.href}
                className="flex h-full min-w-0 flex-col gap-2 border border-transparent bg-background px-4 py-3 transition-colors hover:border-border hover:bg-muted/40 focus:outline-none"
              >
                <span className="text-sm font-medium text-foreground">{link.title}</span>
                <span className="min-w-0 whitespace-normal break-words text-xs leading-relaxed text-muted-foreground">
                  {link.description}
                </span>
              </Link>
            )}
          </NavigationMenuLink>
        </li>
      ))}
    </ul>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <header className="w-full bg-background z-[100] relative font-mono">
      <div className="mx-auto flex min-h-[72px] w-full max-w-5xl items-center justify-between px-4 sm:min-h-[80px] sm:px-6 md:px-12">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Routstr
            </span>
          </Link>

          <NavigationMenu className="hidden md:flex" viewport>
            <NavigationMenuList>
              {menuGroups.map((group) => (
                <NavigationMenuItem key={group.title}>
                  <NavigationMenuTrigger>{group.title}</NavigationMenuTrigger>
                  <NavigationMenuContent className="md:w-[32rem]">
                    <MenuPanel links={group.links} />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 border-border bg-muted px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            <a href="https://github.com/routstr" target="_blank" rel="noopener noreferrer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="text-amber-400"
              >
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
              </svg>
              Star on github
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center text-foreground"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-[72px] z-50 max-h-[calc(100vh-72px)] overflow-y-auto bg-background px-4 py-5 sm:top-[80px] sm:max-h-[calc(100vh-80px)] sm:px-6 md:hidden"
          >
            <div className="flex flex-col gap-5">
              <Link href="/models" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Models
              </Link>
              <Link href="/providers" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Providers
              </Link>
              <Link href="/stats" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Stats
              </Link>
              <Link href="/topup" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Top-Up
              </Link>
              <Link href="/blog" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Blog
              </Link>
              <Link href="/roadmap" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
                Roadmap
              </Link>
            </div>

            <div className="my-5 h-px bg-border" />

            <div className="flex flex-col gap-5">
              <a
                href="https://chat.routstr.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-base font-medium text-foreground"
              >
                Chat
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href="https://beta.platform.routstr.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-base font-medium text-foreground"
              >
                Platform
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href="https://docs.routstr.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-base font-medium text-foreground"
              >
                Docs
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <Button
                variant="outline"
                asChild
                className="h-11 w-full border-border bg-muted text-sm font-medium text-foreground hover:bg-muted"
              >
                <a
                  href="https://github.com/routstr"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    className="text-amber-400"
                  >
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
                  </svg>
                  Star on github
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

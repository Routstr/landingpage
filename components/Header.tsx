"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoutstrMark } from "@/components/RoutstrMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
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

// The entrance animation is a homepage-only, once-per-page-load moment.
// The header remounts on every client navigation (each page renders its own
// shell), so replaying it there would leave the navbar invisible for seconds.
let hasPlayedHeaderIntro = false;

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
      {
        title: "Capabilities & Integration",
        href: "/capabilities",
        description: "What the network does and how to plug it in.",
      },
    ],
  },
  {
    title: "Products",
    links: [
      {
        title: "Routstr Daemon",
        href: "/routstrd",
        description: "Local daemon for uncensorable AI access.",
      },
      {
        title: "Hosted Daemon",
        href: "https://github.com/routstr/routstrd-remote",
        description: "Serve routstrd to your team from a hosted instance.",
        external: true,
      },
      {
        title: "Chat",
        href: "https://chat.routstr.com",
        description: "Use Routstr through the hosted chat client.",
        external: true,
      },
      {
        title: "Top-Up",
        href: "/topup",
        description: "Fund an API key with Cashu or Lightning.",
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
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextScrolled = window.scrollY > 80;
        setScrolled((current) => (current === nextScrolled ? current : nextScrolled));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useGSAP(
    () => {
      if (pathname !== "/" || hasPlayedHeaderIntro) return;
      hasPlayedHeaderIntro = true;

      const intro = gsap.timeline({ delay: 2.75 });
      intro.fromTo(
        "[data-header-brand]",
        { opacity: 0, y: -12, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }
      );
      intro.fromTo(
        "[data-header-nav-item]",
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.42, stagger: 0.07, ease: "power3.out" },
        "-=0.28"
      );
      intro.fromTo(
        "[data-header-announcement]",
        { opacity: 0, y: -8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.4)" },
        "-=0.24"
      );
      intro.fromTo(
        "[data-header-actions]",
        { opacity: 0, y: -8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "back.out(1.4)" },
        "-=0.26"
      );
    },
    { scope: headerRef }
  );

  useGSAP(
    () => {
      const menu = mobileMenuRef.current;
      if (!menu) return;

      if (mobileMenuOpen) {
        gsap.killTweensOf(menu);
        gsap.set(menu, { display: "block" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
        );
      } else {
        gsap.killTweensOf(menu);
        gsap.to(menu, {
          opacity: 0,
          y: -10,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => gsap.set(menu, { display: "none" }),
        });
      }
    },
    { dependencies: [mobileMenuOpen] }
  );

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-[100] w-full font-mono transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1800px] items-center justify-between px-4 sm:min-h-[80px] sm:px-[clamp(1rem,5vw,5rem)]">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link href="/" data-header-brand className="flex items-center gap-2.5">
            <RoutstrMark className="h-6 w-6 shrink-0 text-foreground" />
            <span className="text-sm sm:text-base font-medium tracking-[0.28em] text-foreground">
              ROUTSTR
            </span>
          </Link>
          <Link
            href="/routstrd"
            data-header-announcement
            className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground md:hidden"
          >
            Routstrd
            <ArrowUpRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          <NavigationMenu className="hidden md:flex" viewport>
            <NavigationMenuList>
              {menuGroups.map((group) => (
                <NavigationMenuItem key={group.title} data-header-nav-item>
                  <NavigationMenuTrigger>{group.title}</NavigationMenuTrigger>
                  <NavigationMenuContent className="md:w-[32rem]">
                    <MenuPanel links={group.links} />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <Link
            href="/routstrd"
            data-header-announcement
            className="group hidden items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
          >
            Announcing Routstrd
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div data-header-actions className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            <a href="https://github.com/routstr" target="_blank" rel="noopener noreferrer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="mr-1 text-foreground transition-[scale,rotate,filter] duration-300 ease-out group-hover/button:scale-125 group-hover/button:-rotate-12 group-hover/button:text-[#e7c46a] group-hover/button:drop-shadow-[0_0_6px_rgba(231,196,106,0.45)]"
              >
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
              </svg>
              Star on github
              <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
            </a>
          </Button>
          <ThemeToggle />
        </div>

        <div data-header-actions className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="inline-flex h-10 w-10 items-center justify-center text-foreground"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        ref={mobileMenuRef}
        style={{ display: "none", opacity: 0 }}
        aria-hidden={!mobileMenuOpen}
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
          <Link href="/routstrd" onClick={closeMobileMenu} className="text-base font-medium text-foreground">
            Routstr Daemon
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
            href="https://github.com/routstr/routstrd-remote"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 text-base font-medium text-foreground"
          >
            Hosted Daemon
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
                className="mr-1 text-foreground"
              >
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
              </svg>
              Star on github
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

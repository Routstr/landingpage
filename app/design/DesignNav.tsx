"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RoutstrMark } from "@/components/RoutstrMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; exact?: boolean };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Foundations",
    items: [{ href: "/design", label: "Overview", exact: true }],
  },
  {
    title: "Tokens",
    items: [
      { href: "/design/colors", label: "Colors" },
      { href: "/design/typography", label: "Typography" },
      { href: "/design/motion", label: "Motion" },
    ],
  },
  {
    title: "Components",
    items: [
      { href: "/design/buttons", label: "Buttons" },
      { href: "/design/cards", label: "Cards" },
    ],
  },
];

const flatItems = groups.flatMap((g) => g.items);

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function DesignNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => setSheetOpen(false), [pathname]);

  const currentLabel = flatItems.find((i) =>
    i.exact ? pathname === i.href : pathname.startsWith(i.href)
  )?.label ?? "Design system";

  return (
    <>
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="border-b border-border px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <RoutstrMark className="h-5 w-5 shrink-0 text-foreground" />
            <span className="text-sm font-medium tracking-[0.28em] text-foreground">ROUTSTR</span>
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Design system
          </p>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="border-t border-border px-6 py-4">
          <Link href="/" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            ← Back to site
          </Link>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-expanded={sheetOpen}
        aria-controls="design-mobile-sheet"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-3 text-left backdrop-blur lg:hidden"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Current page
          </span>
          <span className="truncate text-[15px] font-semibold text-foreground">{currentLabel}</span>
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground">
          ▴
        </span>
      </button>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 bg-background/70 lg:hidden"
          onClick={() => setSheetOpen(false)}
        />
      ) : null}

      <aside
        id="design-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Select page"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[60svh] flex-col rounded-t-2xl border-t border-border bg-background transition-transform duration-200 lg:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <span className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Design system
            </span>
            <span className="text-[15px] font-semibold text-foreground">Select page</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} onNavigate={() => setSheetOpen(false)} />
        </nav>
      </aside>

      <div className="hidden lg:block">
        <div className="fixed right-6 top-6 z-30">
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

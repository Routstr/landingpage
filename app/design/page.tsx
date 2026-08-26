import Link from "next/link";
import { RoutstrMark } from "@/components/RoutstrMark";
import { DesignSection, DesignBlock } from "./DesignSection";

const links = [
  { href: "/design/colors", label: "Colors", desc: "Primitive, semantic, and brand tokens for both themes." },
  { href: "/design/typography", label: "Typography", desc: "Type scale, the mono font, and the wordmark treatment." },
  { href: "/design/motion", label: "Motion", desc: "GSAP easing/duration doctrine used across the site." },
  { href: "/design/buttons", label: "Buttons", desc: "Every Button variant and size, live." },
  { href: "/design/cards", label: "Cards", desc: "Surface and card patterns used across pages." },
];

export default function DesignOverviewPage() {
  return (
    <DesignSection
      eyebrow="Foundations"
      title="Routstr design system"
      description="The living source of truth for Routstr's visual language — tokens and components pulled directly from the site's own CSS, not a separate spec that can drift out of sync."
    >
      <DesignBlock title="Identity">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-10">
            <RoutstrMark className="h-12 w-12 text-foreground" />
            <span className="text-sm font-medium tracking-[0.28em] text-foreground">ROUTSTR</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          <code className="text-foreground">components/RoutstrMark.tsx</code> is the single source of
          truth for the mark used in the header, favicon, and here — change it once and every usage
          updates. See{" "}
          <Link href="/logo-lab" className="text-foreground underline underline-offset-4">
            the logo-lab gallery
          </Link>{" "}
          for the full candidate history and scoring notes on which mark to use. Ideally the mark
          renders with <code className="text-foreground">fill=&quot;currentColor&quot;</code> so it
          inherits <code className="text-foreground">text-foreground</code> and adapts to both themes
          without separate light/dark asset files — check the current implementation is still doing
          that before shipping a mark change.
        </p>
      </DesignBlock>

      <DesignBlock title="Personality">
        <ul className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="mb-1 block font-semibold text-foreground">Quiet &amp; technical</span>
            Monospace-forward, sharp corners, thin 1px dividers instead of shadows or heavy borders.
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="mb-1 block font-semibold text-foreground">Sparing accent</span>
            Bitcoin orange (<code className="text-foreground">--brand</code>) is used rarely and
            deliberately — one lit facet, one status dot, never a wash of color.
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="mb-1 block font-semibold text-foreground">Same energy, both modes</span>
            Light mode is a direct inversion of dark mode&apos;s personality, not a softer/friendlier
            reskin — same sharpness, same restraint.
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="mb-1 block font-semibold text-foreground">No gradient buttons</span>
            Flat fills only. Terminal/code mockups (syntax-highlighted code blocks, log viewers) are
            the one deliberate exception — those stay fixed-dark in both themes, like a real terminal.
          </li>
        </ul>
      </DesignBlock>

      <DesignBlock title="Sections">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-muted/40"
            >
              <span className="mb-1 block text-sm font-semibold text-foreground">{l.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{l.desc}</span>
            </Link>
          ))}
        </div>
      </DesignBlock>
    </DesignSection>
  );
}

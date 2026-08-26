import { DesignSection, DesignBlock } from "../DesignSection";

const surfaceTokens = [
  { name: "background", swatch: "bg-background", note: "Page background" },
  { name: "foreground", swatch: "bg-foreground", note: "Primary text" },
  { name: "card", swatch: "bg-card", note: "Card / raised surface" },
  { name: "muted", swatch: "bg-muted", note: "Muted surface (pills, subtle fills)" },
  { name: "muted-foreground", swatch: "bg-muted-foreground", note: "Secondary text" },
  { name: "border", swatch: "bg-border", note: "Dividers, card outlines" },
  { name: "secondary", swatch: "bg-secondary", note: "Secondary surface" },
  { name: "accent", swatch: "bg-accent", note: "Accent surface (hover states)" },
];

const brandTokens = [
  { name: "brand", swatch: "bg-brand", note: "Bitcoin orange — sparing use only" },
  { name: "success", swatch: "bg-success", note: "Live/status indicator green" },
  { name: "destructive", swatch: "bg-destructive", note: "Errors, destructive actions" },
];

function Swatch({ name, swatch, note }: { name: string; swatch: string; note: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={`h-16 w-full ${swatch}`} />
      <div className="border-t border-border bg-card p-3">
        <p className="font-mono text-xs font-semibold text-foreground">--{name}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

export default function DesignColorsPage() {
  return (
    <DesignSection
      eyebrow="Tokens"
      title="Colors"
      description="Every color is a CSS custom property defined twice — once under :root (light), once under .dark — never a one-off hex value in a component. Toggle the theme (top right) to see these flip live."
    >
      <DesignBlock title="Surfaces">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {surfaceTokens.map((t) => (
            <Swatch key={t.name} {...t} />
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Brand & status">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {brandTokens.map((t) => (
            <Swatch key={t.name} {...t} />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          <code className="text-foreground">--brand</code> and <code className="text-foreground">--success</code>{" "}
          hold the same value in both themes (#f7931a and #34d399) — orange and green read fine on both
          a near-black and a near-white surface, so they don&apos;t need per-theme variants.
        </p>
      </DesignBlock>

      <DesignBlock title="Rule">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Components should reference semantic tokens (<code className="text-foreground">text-foreground</code>,{" "}
          <code className="text-foreground">bg-card</code>, <code className="text-foreground">border-border</code>)
          rather than raw hex or Tailwind gray/neutral scales. The one deliberate exception is decorative
          &ldquo;device frame&rdquo; content — simulated terminal windows and syntax-highlighted code blocks —
          which stay fixed-dark in both themes by design, the same way a screenshot of a dark IDE doesn&apos;t
          relight itself for a light-mode reader.
        </p>
      </DesignBlock>
    </DesignSection>
  );
}

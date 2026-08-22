import { DesignSection, DesignBlock } from "../DesignSection";

export default function DesignCardsPage() {
  return (
    <DesignSection
      eyebrow="Components"
      title="Cards"
      description="There's no single reusable Card primitive yet — these are the surface patterns actually used across the site, kept here as reference so new sections stay consistent instead of inventing a new border/radius/spacing combination each time."
    >
      <DesignBlock title="Feature card">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
              <span className="text-xs font-normal text-muted-foreground/70">[1]</span>
              OpenAI compatible API
            </h3>
            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              A true drop-in replacement for chat completions — no vendor lock-in, no rewrites.
            </p>
            <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
              visual slot
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Anatomy</p>
            <ul className="flex flex-col gap-1">
              <li>Title + numbered index label, no card border around the text block itself</li>
              <li>Visual/demo area gets its own <code className="text-foreground">rounded-xl</code> frame</li>
              <li>No drop shadow — hierarchy comes from spacing and the border alone</li>
            </ul>
          </div>
        </div>
      </DesignBlock>

      <DesignBlock title="List row (models / providers)">
        <div className="flex flex-col divide-y divide-border/30 rounded-lg border border-border/30">
          {["gpt-4o-mini", "claude-3-5-sonnet", "llama-3.1-70b"].map((name) => (
            <div key={name} className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-bold text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground">1,250 sats / 1M tokens</span>
            </div>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Status pill">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Live node activity
          </span>
        </div>
      </DesignBlock>

      <DesignBlock title="Rules">
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-semibold text-foreground">Border over shadow.</span> A 1px{" "}
            <code className="text-foreground">border-border</code> does the work a drop shadow would
            elsewhere — keeps the terminal/quiet register instead of introducing depth cues.
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-semibold text-foreground">bg-card, not bg-muted, for raised content.</span>{" "}
            <code className="text-foreground">bg-muted</code> is for pills/inline fills;{" "}
            <code className="text-foreground">bg-card</code> is for anything that reads as its own
            surface.
          </li>
        </ul>
      </DesignBlock>
    </DesignSection>
  );
}

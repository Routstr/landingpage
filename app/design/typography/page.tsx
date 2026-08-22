import { RoutstrMark } from "@/components/RoutstrMark";
import { DesignSection, DesignBlock } from "../DesignSection";

const scale = [
  { cls: "text-[2.6rem] md:text-4xl lg:text-5xl", label: "Hero", sample: "Access to AI is Now" },
  { cls: "text-2xl md:text-3xl", label: "H1 / Section CTA", sample: "Join the decentralized AI revolution" },
  { cls: "text-xl", label: "H2 / Section heading", sample: "Key capabilities" },
  { cls: "text-base font-bold", label: "H3 / Card title", sample: "OpenAI compatible API" },
  { cls: "text-base", label: "Body — large", sample: "Pay-per-request AI APIs with Bitcoin micropayments." },
  { cls: "text-sm", label: "Body — default", sample: "Works seamlessly with any OpenAI SDK or application." },
  { cls: "text-xs", label: "Caption / label", sample: "sats / 1M tokens" },
];

export default function DesignTypographyPage() {
  return (
    <DesignSection
      eyebrow="Tokens"
      title="Typography"
      description="One typeface, used everywhere: Geist Mono. There's no separate display/serif face — headings are just larger, bolder mono, which is what keeps the terminal register consistent from hero to footnote."
    >
      <DesignBlock title="Type scale">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {scale.map((t) => (
            <div key={t.label} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-40 shrink-0 font-mono text-[11px] text-muted-foreground">{t.label}</span>
              <span className={`text-foreground ${t.cls}`}>{t.sample}</span>
            </div>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Wordmark treatment">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2.5">
            <RoutstrMark className="h-6 w-6 shrink-0 text-foreground" />
            <span className="text-base font-medium tracking-[0.28em] text-foreground">ROUTSTR</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Full caps, wide letter-spacing (<code className="text-foreground">tracking-[0.28em]</code>),
            medium weight — a quiet, understated register rather than a loud logotype. Used only in the
            header lockup; body copy stays sentence case.
          </p>
        </div>
      </DesignBlock>

      <DesignBlock title="Weight & color pairing">
        <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-bold text-foreground">font-bold + text-foreground</span>
            <p className="mt-1 text-xs text-muted-foreground">Headings, card titles, emphasis.</p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-light text-muted-foreground">font-light + text-muted-foreground</span>
            <p className="mt-1 text-xs text-muted-foreground">Body copy, descriptions.</p>
          </li>
        </ul>
      </DesignBlock>
    </DesignSection>
  );
}

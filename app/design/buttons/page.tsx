import { Button } from "@/components/ui/button";
import { DesignSection, DesignBlock } from "../DesignSection";

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const sizes = ["xs", "sm", "default", "lg"] as const;

export default function DesignButtonsPage() {
  return (
    <DesignSection
      eyebrow="Components"
      title="Buttons"
      description="Flat fills, sharp corners (rounded-none), thin borders instead of shadows. No gradient buttons — that's a hard no across every skin this project could use."
    >
      <DesignBlock title="Variants">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-6">
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="Sizes">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-6">
          {sizes.map((s) => (
            <Button key={s} size={s}>
              {s}
            </Button>
          ))}
        </div>
      </DesignBlock>

      <DesignBlock title="States">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-6">
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled outline
          </Button>
        </div>
      </DesignBlock>
    </DesignSection>
  );
}

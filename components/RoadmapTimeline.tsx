import React from "react";

export interface RoadmapItem {
  id?: string;
  timeframe: string;
  theme?: string;
  description: string;
  detailed?: boolean;
  milestones?: string[];
}

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  alternating?: boolean;
  showTheme?: boolean;
}

const RoadmapTimeline: React.FC<RoadmapTimelineProps> = ({
  items,
  showTheme = false
}) => {
  return (
    <div className="relative font-mono">
      <div className="absolute bottom-0 left-2 top-0 w-px bg-border/30 sm:left-0"></div>

      <div className="flex flex-col gap-24">
        {items.map((item, index) => (
          <div
            key={item.id || `roadmap-${index}`}
            className="group relative pl-8 sm:pl-12"
            id={item.id}
          >
            {/* Marker */}
            <div className="absolute left-2 top-0 mt-4 h-px w-5 -translate-x-1/2 bg-foreground transition-colors group-hover:bg-white sm:left-0 sm:w-8" />
            <div className="absolute left-0 top-0 mt-2.5 hidden w-auto -translate-x-[58px] whitespace-nowrap pr-2 text-right text-[10px] font-bold text-muted-foreground sm:block">
              RIP-{index + 1}
            </div>

            {/* Content */}
            <div className="text-left">
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-[10px] tracking-widest text-muted-foreground">{item.timeframe}</span>
                <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{item.description}</h3>
                {showTheme && item.theme && (
                  <div className="inline-block mt-1 text-[10px] font-bold text-muted-foreground">{item.theme}</div>
                )}
              </div>

              {item.detailed && item.milestones && (
                <ul className="space-y-4 text-sm text-muted-foreground">
                  {item.milestones.map((milestone, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <span className="text-muted-foreground shrink-0 text-xs">[*]</span>
                      <span className="leading-relaxed">{milestone}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoadmapTimeline;

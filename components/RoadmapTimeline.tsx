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
  alternating = true,
  showTheme = false
}) => {
  return (
    <div className="relative">
      {/* Vertical line */}
      {alternating ? (
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-white/70"></div>
      ) : (
        <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-white/70"></div>
      )}

      {/* Timeline items */}
      {items.map((item, index) => {
        // For alternating timeline, even items go on left, odd on right
        const isEvenItem = index % 2 === 0;

        if (alternating) {
          return (
            <div
              key={item.id || `roadmap-${index}`}
              className="flex flex-col md:flex-row mb-12 relative"
            >
              {/* Left side content for even items */}
              <div className={`md:w-1/2 ${isEvenItem ? 'md:pr-12 md:text-right mb-6 md:mb-0' : 'md:pr-12 md:text-right md:block hidden'}`}>
                {isEvenItem && (
                  <>
                    <div className="font-bold text-white text-xl mb-2">{item.timeframe}</div>
                    {showTheme && item.theme && <div className="text-gray-400 mb-2">{item.theme}</div>}
                    <div className="text-gray-300">{item.description}</div>

                    {item.detailed && item.milestones && (
                      <ul className="space-y-2 text-gray-300 mt-3 text-sm list-disc pl-4 md:pl-0 md:list-none">
                        {item.milestones.map((milestone, i) => (
                          <li key={i} className={`${isEvenItem ? 'md:text-right' : ''}`}>{milestone}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* Center dot - perfectly centered on line */}
              <div className="absolute left-4 md:left-1/2 top-0 w-8 h-8 rounded-full bg-white/10 border-2 border-white/70 transform -translate-x-1/2 flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>

              {/* Right side content for odd items */}
              <div className={`md:w-1/2 ${!isEvenItem ? 'md:pl-12 md:text-left pl-12' : 'md:pl-12 md:text-left pl-12 md:pl-0'}`}>
                {!isEvenItem && (
                  <>
                    <div className="font-bold text-white text-xl mb-2">{item.timeframe}</div>
                    {showTheme && item.theme && <div className="text-gray-400 mb-2">{item.theme}</div>}
                    <div className="text-gray-300">{item.description}</div>

                    {item.detailed && item.milestones && (
                      <ul className="space-y-2 text-gray-300 mt-3 text-sm">
                        {item.milestones.map((milestone, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-gray-500">•</span>
                            <span>{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        } else {
          // Non-alternating timeline (all items on right)
          return (
            <div
              key={item.id || `roadmap-${index}`}
              className="mb-12 relative"
              id={item.id}
            >
              {/* Center dot - perfectly centered on line */}
              <div className="absolute left-4 md:left-8 top-0 w-8 h-8 rounded-full bg-white/10 border-2 border-white/70 transform -translate-x-1/2 flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>

              {/* Content */}
              <div className="ml-12 md:ml-16">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mb-4">
                  <h3 className="text-xl font-bold text-white">{item.timeframe}</h3>
                  {showTheme && item.theme && (
                    <div className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300">{item.theme}</div>
                  )}
                </div>

                <div className="text-gray-300">{item.description}</div>

                {item.detailed && item.milestones && (
                  <ul className="space-y-2 text-gray-300 mt-3">
                    {item.milestones.map((milestone, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-gray-500">•</span>
                        <span>{milestone}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default RoadmapTimeline; 
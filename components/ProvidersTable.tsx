interface Endpoint {
  provider: string;
  context: number;
  max_output: number;
  input_cost: number;
  output_cost: number;
}

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
// Pricing view not used here because endpoint data lacks USD pricing.

type TooltipState = {
  input: boolean;
  output: boolean;
};

interface ProvidersTableProps {
  endpoints: Endpoint[];
}

export default function ProvidersTable({ endpoints }: ProvidersTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState<TooltipState>({
    input: false,
    output: false
  });
  // Sort cheapest first by input_cost (lower sats per token means higher tokens/sat, but input_cost is in sats/token equivalent; keep consistent with other parts: lower cost is cheaper)
  const sorted = [...endpoints].sort((a, b) => Number(a.input_cost) - Number(b.input_cost));
  const visibleEndpoints = isExpanded ? sorted : sorted.slice(0, 6);

  return (
      <div className="flex flex-col bg-black text-white">
          <h2 className="text-2xl font-bold mb-6">All Available Providers({endpoints.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Provider</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Context</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Max Output</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                    <Popover open={tooltipOpen.input} onOpenChange={(open) => setTooltipOpen({...tooltipOpen, input: open})}>
                      <PopoverTrigger
                        className="flex items-center gap-1"
                        onMouseEnter={() => setTooltipOpen({...tooltipOpen, input: true})}
                        onMouseLeave={() => setTooltipOpen({...tooltipOpen, input: false})}
                      >
                        Input
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                      </PopoverTrigger>
                      <PopoverContent className="w-33 p-2 text-sm bg-gray-800 text-white" side="top" align="start">
                        tokens per sat (input)
                      </PopoverContent>
                    </Popover>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                    <Popover open={tooltipOpen.output} onOpenChange={(open) => setTooltipOpen({...tooltipOpen, output: open})}>
                      <PopoverTrigger
                        className="flex items-center gap-1"
                        onMouseEnter={() => setTooltipOpen({...tooltipOpen, output: true})}
                        onMouseLeave={() => setTooltipOpen({...tooltipOpen, output: false})}
                      >
                        Output
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                      </PopoverTrigger>
                      <PopoverContent className="w-33 p-2 text-sm bg-gray-800 text-white" side="top" align="start">
                        tokens per sat (output)
                      </PopoverContent>
                    </Popover>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleEndpoints.map((endpoint, index) => (
                  <tr key={index} className="bg-black hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{endpoint.provider}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{endpoint.context}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{endpoint.max_output}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Number(endpoint.input_cost) > 0 ? (1 / Number(endpoint.input_cost)).toFixed(2) : '—'} tokens/sat</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Number(endpoint.output_cost) > 0 ? (1 / Number(endpoint.output_cost)).toFixed(2) : '—'} tokens/sat</td>
                  </tr>
                ))}
              </tbody>
              {endpoints.length > 6 && (
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td colSpan={5} className="py-1">
                      <div className="flex justify-center">
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white transition-colors px-6"
                        >
                          {isExpanded ? (
                            <>
                              <span>Show Less</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m18 15-6-6-6 6"/>
                              </svg>
                            </>
                          ) : (
                            <>
                              |                             <span>Show More</span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6"/>
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
      </div>
      );
    }
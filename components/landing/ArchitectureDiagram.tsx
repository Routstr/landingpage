import {
  Globe,
  Smartphone,
  Server,
  Zap,
  Database,
  Cpu,
  Box,
  ArrowDown,
} from "lucide-react";

export function ArchitectureDiagram() {
  return (
    <div className="relative w-full min-h-[680px] md:h-[620px] bg-neutral-950 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-3 md:p-4">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* Desktop connectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Nostr to endpoints (dotted) */}
        <path
          d="M20 18 L20 38"
          stroke="#a855f780"
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
        <path
          d="M80 18 L80 38"
          stroke="#a855f780"
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
        {/* Cashu to endpoints (dotted) */}
        <path
          d="M20 62 L20 82"
          stroke="#f59e0b99"
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
        <path
          d="M80 62 L80 82"
          stroke="#f59e0b99"
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
        {/* Main line (solid) */}
        <path
          d="M30 50 L70 50"
          stroke="#cbd5f580"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 w-full h-full max-w-7xl flex flex-col justify-between py-6 md:py-12 px-2 md:px-8">
        {/* Top: Nostr */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-1 md:gap-1.5 text-center">
            <div className="p-2.5 md:p-3 rounded-xl bg-neutral-900 border border-purple-500/30">
              <Globe className="w-4 h-4 md:w-5 md:h-5 text-purple-300" />
            </div>
            <span className="text-[11px] md:text-xs text-purple-100 font-semibold">
              Nostr Network
            </span>
            <span className="text-[9px] md:text-[10px] text-neutral-500 tracking-[0.18em] uppercase">
              Discovery
            </span>
          </div>
        </div>

        {/* Middle: Client -> Node */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-14 my-4 md:my-0">
          {/* Client */}
          <div className="w-full max-w-[200px] md:w-48">
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-3 md:p-4 shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center mb-2 md:mb-3">
                <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-sm">Client App</h3>
              <p className="text-neutral-500 text-xs">OpenAI Compatible</p>
              <div className="mt-3 md:mt-4 inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1">
                <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-400" />
                <span className="text-[10px] md:text-[11px] text-yellow-100 font-medium">
                  Cashu Token
                </span>
              </div>
            </div>
          </div>

          {/* Connection labels */}
          <div className="flex flex-col items-center text-center whitespace-nowrap py-2 md:py-0">
            <span className="text-[10px] md:text-[11px] text-neutral-400 font-mono tracking-wide mb-1 md:mb-3">
              HTTPS / JSON
            </span>
            <ArrowDown className="w-4 h-4 text-neutral-600 md:hidden" />
            <span className="text-[10px] md:text-[11px] text-yellow-300 font-mono tracking-wide mt-1 md:mt-3">
              + eCash Payment
            </span>
          </div>

          {/* Node */}
          <div className="w-full max-w-[220px] md:w-56">
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-3 md:p-4 shadow-md">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 pb-2 md:pb-3 border-b border-white/5">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center">
                  <Server className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    Routstr Node
                  </h3>
                  <p className="text-neutral-500 text-[10px] md:text-[11px]">
                    Independent Provider
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-2 p-1.5 md:p-2 rounded-lg border border-white/5 bg-neutral-900/80">
                  <Cpu className="w-3 h-3 md:w-3.5 md:h-3.5 text-neutral-300" />
                  <span className="text-[10px] md:text-[11px] text-neutral-200">
                    Upstream Model
                  </span>
                </div>
                <div className="flex items-center gap-2 p-1.5 md:p-2 rounded-lg border border-white/5 bg-neutral-900/80">
                  <Box className="w-3 h-3 md:w-3.5 md:h-3.5 text-neutral-300" />
                  <span className="text-[10px] md:text-[11px] text-neutral-200">
                    Custom Server
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Cashu */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-1 md:gap-1.5 text-center">
            <div className="p-2.5 md:p-3 rounded-xl bg-neutral-900 border border-orange-500/30">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-orange-300" />
            </div>
            <span className="text-[11px] md:text-xs text-orange-100 font-semibold">
              Cashu Mint
            </span>
            <span className="text-[9px] md:text-[10px] text-neutral-500 tracking-[0.18em] uppercase">
              Settlement
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

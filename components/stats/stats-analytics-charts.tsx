"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCompactNumber } from "@/lib/number-format";
import type { ChartMode } from "@/components/stats/top-models-usage-chart";

export type ProviderComparisonPoint = {
  providerLabel: string;
  value: number;
  share: number;
  activeModels: number;
  requests: number;
  revenueSats: number;
  tokens: number;
};

export type ModelSharePoint = {
  label: string;
  value: number;
  share: number;
};

type ProviderComparisonChartProps = {
  data: ProviderComparisonPoint[];
  mode: ChartMode;
  title?: string;
  description?: string;
};

type ModelShareChartProps = {
  data: ModelSharePoint[];
  mode: ChartMode;
  title?: string;
  description?: string;
};

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(196 72% 60%)",
  "hsl(18 78% 60%)",
  "hsl(334 78% 58%)",
];

function formatModeValue(
  value: number,
  mode: ChartMode,
  {
    withUnit = false,
  }: { withUnit?: boolean } = {}
): string {
  const formatted = formatCompactNumber(value, {
    standardMaximumFractionDigits: mode === "revenue" ? 1 : 0,
    compactMaximumFractionDigits: 1,
  });

  if (!withUnit) return formatted;
  if (mode === "requests") return `${formatted} requests`;
  if (mode === "tokens") return `${formatted} tokens`;
  return `${formatted} sats`;
}

function getModeLabel(mode: ChartMode): string {
  if (mode === "requests") return "Requests";
  if (mode === "tokens") return "Tokens";
  return "Revenue";
}

function clampLabel(value: string, max = 26): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function getSeriesColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length];
}

export function ProviderComparisonChart({
  data,
  mode,
  title = "Provider Comparison",
  description,
}: ProviderComparisonChartProps) {
  const isMobile = useIsMobile();
  const chartData = useMemo(() => data.slice(0, 10).reverse(), [data]);
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: getModeLabel(mode),
        color: "var(--chart-3)",
      },
    }),
    [mode]
  );

  if (chartData.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-5">
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="pt-2 sm:pt-3">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full sm:h-[260px]"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 4,
              right: isMobile ? 8 : 18,
              left: isMobile ? 4 : 14,
              bottom: 0,
            }}
          >
            <CartesianGrid horizontal={false} className="stroke-border" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) =>
                formatModeValue(
                  typeof value === "number" ? value : Number(value || 0),
                  mode
                )
              }
            />
            <YAxis
              type="category"
              dataKey="providerLabel"
              tickLine={false}
              axisLine={false}
              width={isMobile ? 72 : 96}
              tick={{ fill: "var(--foreground)", fontSize: 10 }}
              tickFormatter={(value) => clampLabel(String(value), isMobile ? 10 : 15)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.16 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as ProviderComparisonPoint | undefined;
                if (!point) return null;

                return (
                  <div className="min-w-[210px] rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-none">
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      {point.providerLabel}
                    </p>
                    <div className="space-y-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                        <span className="text-muted-foreground">{getModeLabel(mode)}</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatModeValue(point.value, mode, { withUnit: true })}
                        </span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                        <span className="text-muted-foreground">Share</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {(point.share * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                        <span className="text-muted-foreground">Active models</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {point.activeModels}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`${entry.providerLabel}-${index}`} fill={getSeriesColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}

export function ModelShareChart({
  data,
  mode,
  title = "Model Share",
  description,
}: ModelShareChartProps) {
  const chartData = useMemo(() => data.slice(0, 8), [data]);
  const totalValue = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.label] = {
        label: item.label,
        color: getSeriesColor(index),
      };
    });
    return config;
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-5">
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 pt-2 sm:pt-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                const point = entry?.payload as ModelSharePoint | undefined;
                if (!point) return null;

                return (
                  <div className="min-w-[180px] rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-none">
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{point.label}</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatModeValue(point.value, mode, { withUnit: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Share</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {(point.share * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                    return null;
                  }
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-sm font-semibold"
                      >
                        {formatCompactNumber(totalValue, {
                          standardMaximumFractionDigits: mode === "revenue" ? 1 : 0,
                          compactMaximumFractionDigits: 1,
                        })}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy + 18}
                        className="fill-muted-foreground text-[10px]"
                      >
                        {mode === "revenue" ? "sats" : mode}
                      </tspan>
                    </text>
                  );
                }}
              />
              {chartData.map((entry, index) => (
                <Cell key={entry.label} fill={getSeriesColor(index)} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">Share Breakdown</p>
            <p className="text-xs text-muted-foreground">Percent of selected total</p>
          </div>
          <div className="space-y-0.5">
            {chartData.map((item, index) => (
              <div
                key={item.label}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-1.5 py-2 text-xs"
                title={item.label}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getSeriesColor(index) }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {clampLabel(item.label, 32)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatModeValue(item.value, mode, { withUnit: true })}
                  </p>
                </div>
                <p className="font-mono tabular-nums text-foreground">
                  {(item.share * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

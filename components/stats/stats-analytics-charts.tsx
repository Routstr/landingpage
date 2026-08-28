"use client";

import { useMemo } from "react";
import type {
  ChartData,
  ChartOptions,
  Plugin,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import {
  getSeriesColor,
  useChartTheme,
  useStableSeriesColors,
} from "@/components/stats/chart-js-runtime";
import { ModelCompanyIcon } from "@/components/stats/model-company-icon";
import { formatCompactNumber } from "@/lib/number-format";
import {
  getModeLabel,
  getModeUnit,
  isChartMode,
  type ChartMode,
} from "@/components/stats/stats-chart-domain";

export type ProviderComparisonPoint = {
  providerId: string;
  providerLabel: string;
  value: number;
  share: number;
  activeModels: number;
  requests: number;
  revenueSats: number;
  tokens: number;
};

export type ModelSharePoint = {
  kind: "model" | "other";
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

type ProviderShareSegment =
  | {
      kind: "provider";
      id: string;
      label: string;
      value: number;
      share: number;
      activeModels: number;
    }
  | {
      kind: "other";
      id: string;
      label: string;
      value: number;
      share: number;
      providerCount: number;
    };

const PROVIDER_COMPOSITION_LIMIT = 5;

function formatModeValue(
  value: number,
  mode: ChartMode,
  { withUnit = false }: { withUnit?: boolean } = {}
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

function clampLabel(value: string, max = 26): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

const MODEL_SHARE_CENTER_LABEL: Plugin<"doughnut"> = {
  id: "modelShareCenterLabel",
  afterDraw(chart) {
    const dataset = chart.data.datasets[0];
    const totalValue = (dataset?.data ?? []).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
    const rawMode = String(dataset?.label ?? "");
    const mode: ChartMode = isChartMode(rawMode) ? rawMode : "requests";
    const { left, right, top, bottom } = chart.chartArea;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const context = chart.ctx;
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    const foreground = String(chart.options.color ?? "#e5e5e5");
    const mutedForeground = String(chart.options.borderColor ?? "#a1a1a1");
    const fontFamily = chart.options.font?.family ?? "monospace";
    context.fillStyle = foreground;
    context.font = `600 14px ${fontFamily}`;
    context.fillText(formatModeValue(totalValue, mode), centerX, centerY - 8);
    context.fillStyle = mutedForeground;
    context.font = `10px ${fontFamily}`;
    context.fillText(getModeUnit(mode), centerX, centerY + 10);
    context.restore();
  },
};

export function ProviderComparisonChart({
  data,
  mode,
  title = "Provider Share",
  description,
}: ProviderComparisonChartProps) {
  const chartTheme = useChartTheme();
  const duplicateLabels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const point of data) {
      counts.set(
        point.providerLabel,
        (counts.get(point.providerLabel) ?? 0) + 1
      );
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([label]) => label)
    );
  }, [data]);
  const topProviders = useMemo(
    () => data.slice(0, PROVIDER_COMPOSITION_LIMIT),
    [data]
  );
  const providerColors = useStableSeriesColors(
    topProviders.map((point) => point.providerId),
    chartTheme.seriesColors
  );
  const composition = useMemo<ProviderShareSegment[]>(() => {
    const segments: ProviderShareSegment[] = topProviders.map((point) => ({
      kind: "provider",
      id: point.providerId,
      label: point.providerLabel,
      value: point.value,
      share: point.share,
      activeModels: point.activeModels,
    }));
    const remaining = data.slice(PROVIDER_COMPOSITION_LIMIT);
    if (remaining.length > 0) {
      segments.push({
        kind: "other",
        id: "other-providers",
        label: "Other providers",
        value: remaining.reduce((sum, point) => sum + point.value, 0),
        share: remaining.reduce((sum, point) => sum + point.share, 0),
        providerCount: remaining.length,
      });
    }
    return segments;
  }, [data, topProviders]);

  if (data.length === 0) return null;

  return (
    <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div
        className="mt-5 flex h-3 w-full overflow-hidden bg-muted"
        aria-hidden="true"
      >
        {composition.map((segment) => (
          <span
            key={segment.id}
            className="h-full"
            style={{
              width: `${Math.max(0, segment.share) * 100}%`,
              backgroundColor:
                segment.kind === "other"
                  ? chartTheme.other
                  : providerColors.get(segment.id) ?? chartTheme.other,
            }}
          />
        ))}
      </div>

      <ul
        data-slot="provider-list"
        className="grid gap-x-8 pt-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label={`${title}, share of reported ${mode}`}
      >
        {composition.map((segment) => {
          const sharePercent = Math.max(0, segment.share) * 100;
          const color =
            segment.kind === "other"
              ? chartTheme.other
              : providerColors.get(segment.id) ?? chartTheme.other;
          return (
            <li
              key={segment.id}
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 py-2.5 text-xs"
            >
              <span
                aria-hidden="true"
                className="h-7 w-0.5"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p
                  className="truncate font-medium text-foreground"
                  title={segment.label}
                >
                  {segment.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {segment.kind === "other"
                    ? `${segment.providerCount} ${segment.providerCount === 1 ? "provider" : "providers"}`
                    : `${segment.activeModels} ${segment.activeModels === 1 ? "model" : "models"} reported`}
                  {segment.kind !== "other" && duplicateLabels.has(segment.label)
                    ? ` · ${segment.id.slice(0, 12)}`
                    : ""}
                </p>
              </div>
              <div className="pl-2 text-right">
                <p className="whitespace-nowrap tabular-nums text-foreground">
                  {formatModeValue(segment.value, mode, { withUnit: true })}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {sharePercent.toFixed(1)}%
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {data.length > PROVIDER_COMPOSITION_LIMIT ? (
        <details className="mt-3 border-t border-border">
          <summary className="cursor-pointer py-3 text-xs font-medium text-muted-foreground hover:text-foreground">
            View all {data.length} providers
          </summary>
          <ol
            data-slot="provider-detail-list"
            className="border-t border-border"
            aria-label={`${title}, highest reported ${mode} first`}
          >
            {data.map((point, index) => (
              <li
                key={point.providerId}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 border-b border-border/60 px-1.5 py-2.5 text-xs last:border-b-0"
                title={point.providerLabel}
              >
                <span className="w-5 text-right tabular-nums text-muted-foreground">
                  {index + 1}.
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {point.providerLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {point.activeModels}{" "}
                    {point.activeModels === 1 ? "model" : "models"} reported
                    {duplicateLabels.has(point.providerLabel)
                      ? ` · ${point.providerId.slice(0, 12)}`
                      : ""}
                  </p>
                </div>
                <div className="pl-2 text-right">
                  <p className="whitespace-nowrap tabular-nums text-foreground">
                    {formatModeValue(point.value, mode, { withUnit: true })}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {(Math.max(0, point.share) * 100).toFixed(1)}%
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

export function ModelShareChart({
  data,
  mode,
  title = "Model Share",
  description,
}: ModelShareChartProps) {
  const chartTheme = useChartTheme();
  const chartData = useMemo(() => data.slice(0, 8), [data]);
  const namedModels = useMemo(
    () =>
      chartData
        .filter((item) => item.kind !== "other")
        .map((item) => item.label),
    [chartData]
  );
  const modelColors = useStableSeriesColors(namedModels, chartTheme.seriesColors);
  const colors = useMemo(
    () =>
      chartData.map((item) =>
        item.kind === "other"
          ? chartTheme.other
          : modelColors.get(item.label) ??
            getSeriesColor(item.label, chartTheme.seriesColors)
      ),
    [chartData, chartTheme.seriesColors, chartTheme.other, modelColors]
  );
  const canvasData = useMemo<ChartData<"doughnut", number[], string>>(
    () => ({
      labels: chartData.map((item) => item.label),
      datasets: [
        {
          label: mode,
          data: chartData.map((item) => item.value),
          backgroundColor: colors,
          borderColor: chartTheme.card,
          borderWidth: 2,
          hoverOffset: 0,
          spacing: 1,
        },
      ],
    }),
    [chartData, chartTheme.card, colors, mode]
  );
  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [],
      color: chartTheme.foreground,
      borderColor: chartTheme.mutedForeground,
      font: { family: chartTheme.fontFamily },
      cutout: "68%",
      rotation: -90,
      circumference: 360,
    }),
    [chartTheme]
  );
  if (chartData.length === 0) return null;

  return (
    <section className="border border-border bg-card px-4 py-5 shadow-sm shadow-black/5 sm:px-6 sm:py-6 dark:shadow-black/20">
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 pt-2 sm:pt-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
        <div
          data-slot="chart"
          className="mx-auto h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]"
        >
          <Doughnut
            data={canvasData}
            options={options}
            plugins={[MODEL_SHARE_CENTER_LABEL]}
            datasetIdKey="label"
            redraw={false}
            role="img"
            aria-label={`${title}. ${getModeLabel(mode)} split across the models listed beside the chart.`}
            fallbackContent="Model share chart. Exact values are listed beside the chart."
          />
          <p className="sr-only">
            {getModeLabel(mode)} total:{" "}
            {formatModeValue(
              chartData.reduce((sum, item) => sum + item.value, 0),
              mode
            )}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">Share Breakdown</p>
            <p className="text-xs text-muted-foreground">Percent of selected total</p>
          </div>
          <div className="space-y-0.5">
            {chartData.map((item, index) => (
              <div
                key={`${item.kind}:${item.label}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-1.5 py-2 text-xs"
                title={item.label}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none flex h-7 w-8 items-center gap-2"
                >
                  <span
                    className="h-7 w-0.5 shrink-0"
                    style={{ backgroundColor: colors[index] }}
                  />
                  <ModelCompanyIcon
                    model={item.label}
                    className="size-5 shrink-0 text-foreground"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {clampLabel(item.label, 32)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatModeValue(item.value, mode, { withUnit: true })}
                  </p>
                </div>
                <p className="tabular-nums text-foreground">
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

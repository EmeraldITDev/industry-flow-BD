import {
  ExecutiveIntelligence,
  LATE_STAGES,
  OpportunityRow,
  ProbabilityBand,
  RankedGroup,
  STAGE_LABELS,
  WON_STAGES,
} from './analytics';
import { fmtNgn, fmtUsd } from './format';

/** Chairman overview cards that open the shared snapshot sheet. */
export type MetricPanelKey =
  | 'active'
  | 'won'
  | 'pipeline'
  | 'lateStage'
  | 'highProbability'
  | 'stagnant';

export type SnapshotStageMode = 'full' | 'won' | 'late' | 'none';

export interface SnapshotSummaryStat {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'primary' | 'warning' | 'muted';
  drillTo?: string;
}

export interface ExecutiveSnapshotModel {
  title: string;
  subtitle?: string;
  summaryStats: SnapshotSummaryStat[];
  byStage: Record<string, number>;
  stageMode: SnapshotStageMode;
  byProbability?: Record<ProbabilityBand, number>;
  /** When set, probability bands are shown as non-clickable context only. */
  probabilityContext?: string;
  showProbabilityBands: boolean;
  byEntity: RankedGroup[];
  showEntityBreakdown: boolean;
  entityMetricOverride?: string;
  entityExtraQuery?: string;
  topOpportunities: OpportunityRow[];
  openAllQuery: string;
  openAllLabel: string;
  /** Shared Pipeline USD/NGN panel — toggle which currency is emphasised. */
  currencyToggle?: {
    active: 'USD' | 'NGN';
    usdValue: string;
    ngnValue: string;
    count: number;
  };
}

export interface MetricPanelApiPayload {
  metric: string;
  count: number;
  valueUsd: number;
  valueNgn: number;
  byStage: Record<string, number>;
  byProbability: Record<ProbabilityBand, number>;
  byEntity: RankedGroup[];
  topOpportunities: OpportunityRow[];
}

export function metricPanelQuery(key: MetricPanelKey): { metric: string; extra: Record<string, string> } {
  switch (key) {
    case 'active':
    case 'pipeline':
      return { metric: 'active', extra: {} };
    case 'won':
      return { metric: 'won', extra: {} };
    case 'lateStage':
      return {
        metric: 'active',
        extra: {
          pipelineStages: JSON.stringify(['proposal', 'negotiation', 'approval']),
        },
      };
    case 'highProbability':
      return {
        metric: 'active',
        extra: {
          dealProbabilities: JSON.stringify(['high']),
        },
      };
    case 'stagnant':
      return { metric: 'stagnant', extra: {} };
  }
}

export function openAllQueryFor(key: MetricPanelKey): string {
  const { metric, extra } = metricPanelQuery(key);
  const params = new URLSearchParams({ metric, ...extra });
  return params.toString();
}

function filterStages(
  byStage: Record<string, number>,
  mode: SnapshotStageMode
): Record<string, number> {
  if (mode === 'none') return {};
  if (mode === 'full') return byStage;
  const allow = mode === 'won' ? WON_STAGES : LATE_STAGES;
  const out: Record<string, number> = {};
  for (const stage of allow) {
    if (byStage[stage]) out[stage] = byStage[stage];
  }
  // Include any other won/late keys present (e.g. mixed casing already normalised).
  for (const [stage, count] of Object.entries(byStage)) {
    if (allow.includes(stage as (typeof allow)[number]) && !out[stage]) {
      out[stage] = count;
    }
  }
  return out;
}

/**
 * Build the shared sheet model for a Chairman metric card.
 * Summary figures come from live intelligence totals (Issue 1 source);
 * breakdowns / preview come from the metrics panel endpoint (same query).
 */
export function buildMetricSnapshotModel(
  key: MetricPanelKey,
  data: ExecutiveIntelligence,
  panel: MetricPanelApiPayload,
  options?: { pipelineCurrency?: 'USD' | 'NGN' }
): ExecutiveSnapshotModel {
  const t = data.totals;
  const openAllQuery = openAllQueryFor(key);
  const top = panel.topOpportunities ?? [];
  const byEntity = panel.byEntity ?? [];

  switch (key) {
    case 'active':
      return {
        title: 'Active opportunities',
        summaryStats: [
          {
            label: 'Active opportunities',
            value: String(t.active),
            sub: `${fmtUsd(t.activeUsd)} · ${fmtNgn(t.activeNgn)}`,
            tone: 'primary',
          },
        ],
        byStage: filterStages(panel.byStage, 'full'),
        stageMode: 'full',
        byProbability: panel.byProbability,
        showProbabilityBands: true,
        byEntity,
        showEntityBreakdown: true,
        entityMetricOverride: 'active',
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${t.active} opportunities`,
      };
    case 'won':
      return {
        title: 'Won / in execution',
        summaryStats: [
          {
            label: 'Won / in execution',
            value: String(t.won),
            sub: `${fmtUsd(t.wonUsd)} · ${fmtNgn(t.wonNgn)}`,
          },
        ],
        byStage: filterStages(panel.byStage, 'won'),
        stageMode: 'won',
        showProbabilityBands: false,
        byEntity,
        showEntityBreakdown: true,
        entityMetricOverride: 'won',
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${t.won} opportunities`,
      };
    case 'pipeline': {
      const currency = options?.pipelineCurrency ?? 'USD';
      return {
        title: 'Pipeline',
        summaryStats: [
          {
            label: currency === 'USD' ? 'Pipeline (USD)' : 'Pipeline (NGN)',
            value: currency === 'USD' ? fmtUsd(t.activeUsd) : fmtNgn(t.activeNgn),
            sub: `${t.active} active opportunities`,
            tone: 'primary',
          },
          {
            label: currency === 'USD' ? 'Pipeline (NGN)' : 'Pipeline (USD)',
            value: currency === 'USD' ? fmtNgn(t.activeNgn) : fmtUsd(t.activeUsd),
            sub: 'Same active population',
          },
        ],
        byStage: filterStages(panel.byStage, 'full'),
        stageMode: 'full',
        byProbability: panel.byProbability,
        showProbabilityBands: true,
        byEntity: [],
        showEntityBreakdown: false,
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${t.active} opportunities`,
        currencyToggle: {
          active: currency,
          usdValue: fmtUsd(t.activeUsd),
          ngnValue: fmtNgn(t.activeNgn),
          count: t.active,
        },
      };
    }
    case 'lateStage':
      return {
        title: 'Late-stage value',
        summaryStats: [
          {
            label: 'Late-stage value',
            value: fmtUsd(t.lateStageUsd),
            sub: `${fmtNgn(t.lateStageNgn)} · ${t.lateStage} opportunities`,
          },
        ],
        byStage: filterStages(panel.byStage, 'late'),
        stageMode: 'late',
        showProbabilityBands: false,
        byEntity,
        showEntityBreakdown: true,
        entityMetricOverride: 'active',
        entityExtraQuery: `pipelineStages=${encodeURIComponent(JSON.stringify(['proposal', 'negotiation', 'approval']))}`,
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${t.lateStage} opportunities`,
      };
    case 'highProbability':
      return {
        title: 'High probability',
        subtitle: 'Only opportunities rated high probability. Medium and low are excluded from this view.',
        summaryStats: [
          {
            label: 'High probability',
            value: String(t.high),
            sub: 'Active opportunities in this band',
            tone: 'primary',
          },
        ],
        byStage: filterStages(panel.byStage, 'full'),
        stageMode: 'full',
        showProbabilityBands: false,
        byEntity,
        showEntityBreakdown: true,
        entityMetricOverride: 'active',
        entityExtraQuery: `dealProbabilities=${encodeURIComponent(JSON.stringify(['high']))}`,
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${t.high} opportunities`,
      };
    case 'stagnant': {
      const count = t.stagnant ?? panel.count;
      const days = data.stagnationDays ?? 30;
      return {
        title: 'Stagnant opportunities',
        subtitle: `Active opportunities with no pipeline-stage change in over ${days} days.`,
        summaryStats: [
          {
            label: 'Stagnant opportunities',
            value: String(count),
            sub: `${fmtUsd(panel.valueUsd)} · ${fmtNgn(panel.valueNgn)}`,
            tone: 'warning',
          },
        ],
        byStage: filterStages(panel.byStage, 'full'),
        stageMode: 'full',
        byProbability: panel.byProbability,
        showProbabilityBands: true,
        byEntity,
        showEntityBreakdown: true,
        entityMetricOverride: 'stagnant',
        topOpportunities: top,
        openAllQuery,
        openAllLabel: `Open all ${count} opportunities`,
      };
    }
  }
}

export function stageBadgeEntries(
  byStage: Record<string, number>,
  mode: SnapshotStageMode
): { stage: string; label: string; count: number }[] {
  const filtered = filterStages(byStage, mode);
  const order =
    mode === 'won' ? [...WON_STAGES] : mode === 'late' ? [...LATE_STAGES] : Object.keys(filtered);
  const seen = new Set<string>();
  const out: { stage: string; label: string; count: number }[] = [];
  for (const stage of order) {
    if (seen.has(stage)) continue;
    seen.add(stage);
    const count = filtered[stage];
    if (!count) continue;
    out.push({ stage, label: STAGE_LABELS[stage] ?? stage, count });
  }
  for (const [stage, count] of Object.entries(filtered)) {
    if (seen.has(stage) || !count) continue;
    out.push({ stage, label: STAGE_LABELS[stage] ?? stage, count });
  }
  return out;
}

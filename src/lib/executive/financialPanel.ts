import { Project, PipelineStage } from '@/types';
import {
  OpportunityRow,
  RankedGroup,
  STAGE_LABELS,
  isWon,
  usdOf,
  ngnOf,
} from './analytics';
import { ExecutiveSnapshotModel, SnapshotSummaryStat } from './metricPanel';
import { fmtNgn, fmtUsd } from './format';

/** Rate used for Dashboard "Total Commission" = 5% of stored contract value. */
export const COMMISSION_RATE = 0.05;

export type FinancialPanelKey =
  | 'commission_ngn'
  | 'commission_usd'
  | 'po_ngn'
  | 'margin_pct_usd'
  | 'margin_pct_ngn';

export type FinancialCoverageField =
  | 'ngn'
  | 'usd'
  | 'margin_percent_ngn'
  | 'margin_percent_usd';

const stored = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function emptyGroup(key: string, label: string): RankedGroup {
  return {
    key,
    label,
    count: 0,
    usd: 0,
    ngn: 0,
    lateStage: 0,
    won: 0,
    wonUsd: 0,
    wonNgn: 0,
    avgProbability: 0,
    weightedUsd: 0,
  };
}

function bumpValue(
  map: Map<string, RankedGroup>,
  key: string,
  label: string,
  opts: { usd?: number; ngn?: number; count?: number; won?: boolean; displayValue?: string }
) {
  const g = map.get(key) ?? emptyGroup(key, label);
  g.count += opts.count ?? 1;
  g.usd += opts.usd ?? 0;
  g.ngn += opts.ngn ?? 0;
  if (opts.won) g.won += 1;
  if (opts.displayValue != null) g.displayValue = opts.displayValue;
  map.set(key, g);
}

function rankByCurrency(
  map: Map<string, RankedGroup>,
  currency: 'USD' | 'NGN',
  limit: number
): RankedGroup[] {
  return Array.from(map.values())
    .sort((a, b) => (currency === 'USD' ? b.usd - a.usd : b.ngn - a.ngn))
    .slice(0, limit);
}

function toRow(
  p: Project,
  overrides?: Partial<Pick<OpportunityRow, 'usd' | 'ngn' | 'displayValue'>>
): OpportunityRow {
  const stage = ((p.pipelineStage || 'cold').toLowerCase().trim() || 'cold') as PipelineStage;
  return {
    id: String(p.id),
    name: p.name || 'Untitled',
    client: p.clientName || 'Unspecified',
    stage,
    stageLabel: STAGE_LABELS[stage] ?? stage,
    probability: (p.dealProbability as OpportunityRow['probability']) || 'low',
    usd: overrides?.usd ?? usdOf(p),
    ngn: overrides?.ngn ?? ngnOf(p),
    displayValue: overrides?.displayValue,
    expectedCloseDate: p.expectedCloseDate ?? null,
    businessVertical: p.businessVertical || '',
    sector: p.sector || '',
    products: p.product ? [p.product] : [],
    subproducts: p.subProduct ? [p.subProduct] : [],
    owner: p.salesLead || '',
    lastActivity: null,
    daysIdle: null,
    priorityScore: 0,
  };
}

function qsFromHref(href: string): string {
  const i = href.indexOf('?');
  return i >= 0 ? href.slice(i + 1) : '';
}

function withParam(baseQs: string, key: string, value: string): string {
  const params = new URLSearchParams(baseQs);
  params.set(key, value);
  return params.toString();
}

function coverageFieldLabel(field: FinancialCoverageField): string {
  switch (field) {
    case 'ngn':
      return 'NGN contract value';
    case 'usd':
      return 'USD contract value';
    case 'margin_percent_ngn':
      return 'NGN margin %';
    case 'margin_percent_usd':
      return 'USD margin %';
  }
}

function hasValue(p: Project, field: FinancialCoverageField): boolean {
  switch (field) {
    case 'ngn':
      return stored(p.contractValueNGN) > 0;
    case 'usd':
      return stored(p.contractValueUSD) > 0;
    case 'margin_percent_ngn':
      return stored(p.marginPercentNGN) > 0;
    case 'margin_percent_usd':
      return stored(p.marginPercentUSD) > 0;
  }
}

function projectValue(
  p: Project,
  key: FinancialPanelKey
): { amount: number; currency: 'USD' | 'NGN'; contributing: boolean } {
  switch (key) {
    case 'commission_ngn': {
      const ngn = stored(p.contractValueNGN);
      return { amount: ngn * COMMISSION_RATE, currency: 'NGN', contributing: ngn > 0 };
    }
    case 'commission_usd': {
      const usd = stored(p.contractValueUSD);
      return { amount: usd * COMMISSION_RATE, currency: 'USD', contributing: usd > 0 };
    }
    case 'po_ngn': {
      const ngn = stored(p.contractValueNGN);
      return { amount: ngn, currency: 'NGN', contributing: ngn > 0 };
    }
    case 'margin_pct_usd': {
      const pct = stored(p.marginPercentUSD);
      return { amount: pct, currency: 'USD', contributing: pct > 0 };
    }
    case 'margin_pct_ngn': {
      const pct = stored(p.marginPercentNGN);
      return { amount: pct, currency: 'NGN', contributing: pct > 0 };
    }
  }
}

export function coverageCounts(
  projects: Project[],
  field: FinancialCoverageField
): { contributing: number; missing: number; total: number } {
  let contributing = 0;
  let missing = 0;
  for (const p of projects) {
    if (hasValue(p, field)) contributing += 1;
    else missing += 1;
  }
  return { contributing, missing, total: projects.length };
}

export function coverageLine(contributing: number, total: number): string {
  return `${contributing.toLocaleString()} of ${total.toLocaleString()} projects`;
}

export interface FinancialPanelInput {
  key: FinancialPanelKey;
  projects: Project[];
  /** Formatted headline matching the card exactly. */
  headline: string;
  /** Dashboard filter bar → /projects?… base (no has/missing yet). */
  filterBaseHref: string;
}

/**
 * Build a shared ExecutiveSnapshotModel for Dashboard financial KPI cards.
 * Counts and totals are derived from the same filtered project set as the cards.
 */
export function buildFinancialSnapshotModel(input: FinancialPanelInput): ExecutiveSnapshotModel {
  const { key, projects, headline, filterBaseHref } = input;
  const baseQs = qsFromHref(filterBaseHref);

  const isMargin = key === 'margin_pct_usd' || key === 'margin_pct_ngn';
  const field: FinancialCoverageField =
    key === 'commission_usd' || key === 'margin_pct_usd'
      ? key === 'margin_pct_usd'
        ? 'margin_percent_usd'
        : 'usd'
      : key === 'margin_pct_ngn'
        ? 'margin_percent_ngn'
        : 'ngn';
  const currency: 'USD' | 'NGN' =
    key === 'commission_usd' || key === 'margin_pct_usd' ? 'USD' : 'NGN';

  const contributing = projects.filter((p) => projectValue(p, key).contributing);
  const missingCount = projects.length - contributing.length;
  const hasQs = withParam(baseQs, 'has', field);
  const missingQs = withParam(baseQs, 'missing', field);

  const bySegment = new Map<string, RankedGroup>();
  const byClient = new Map<string, RankedGroup>();
  const byWonOpen = new Map<string, RankedGroup>([
    ['won', emptyGroup('won', 'Won')],
    ['open', emptyGroup('open', 'Open')],
  ]);

  let totalAmount = 0;
  let sumPct = 0;

  for (const p of contributing) {
    const { amount } = projectValue(p, key);
    totalAmount += amount;
    if (isMargin) sumPct += amount;

    const segmentLabel = (p.businessVertical || p.sector || 'Unspecified').trim() || 'Unspecified';
    const segmentKey = segmentLabel.toLowerCase();
    const clientLabel = (p.clientName || 'Unspecified').trim() || 'Unspecified';
    const clientKey = clientLabel.toLowerCase();
    const won = isWon(p);

    if (isMargin) {
      // Accumulate for simple average per group (same method as the card).
      bumpValue(bySegment, segmentKey, segmentLabel, {
        count: 1,
        usd: currency === 'USD' ? amount : 0,
        ngn: currency === 'NGN' ? amount : 0,
        won,
      });
      bumpValue(byClient, clientKey, clientLabel, {
        count: 1,
        usd: currency === 'USD' ? amount : 0,
        ngn: currency === 'NGN' ? amount : 0,
        won,
      });
    } else {
      const usd = currency === 'USD' ? amount : 0;
      const ngn = currency === 'NGN' ? amount : 0;
      bumpValue(bySegment, segmentKey, segmentLabel, { usd, ngn, won });
      bumpValue(byClient, clientKey, clientLabel, { usd, ngn, won });
      const bucket = byWonOpen.get(won ? 'won' : 'open')!;
      bucket.count += 1;
      bucket.usd += usd;
      bucket.ngn += ngn;
      if (won) {
        bucket.won += 1;
        bucket.metric = 'won';
      }
    }
  }

  // Finalise margin group display as simple averages.
  if (isMargin) {
    for (const map of [bySegment, byClient]) {
      for (const g of map.values()) {
        const avg = g.count > 0 ? (currency === 'USD' ? g.usd : g.ngn) / g.count : 0;
        g.displayValue = `${avg.toFixed(2)}%`;
        // Keep magnitude for progress bars.
        if (currency === 'USD') g.usd = avg;
        else g.ngn = avg;
      }
    }
  }

  const avgPct = contributing.length > 0 ? sumPct / contributing.length : 0;

  const topProjects = [...contributing]
    .sort((a, b) => projectValue(b, key).amount - projectValue(a, key).amount)
    .slice(0, 10)
    .map((p) => {
      const { amount } = projectValue(p, key);
      if (isMargin) {
        return toRow(p, {
          usd: 0,
          ngn: 0,
          displayValue: `${amount.toFixed(2)}%`,
        });
      }
      return toRow(p, {
        usd: currency === 'USD' ? amount : 0,
        ngn: currency === 'NGN' ? amount : 0,
      });
    });

  const marginSorted = isMargin
    ? [...contributing].sort(
        (a, b) => projectValue(b, key).amount - projectValue(a, key).amount
      )
    : [];
  const highestMargin = marginSorted.slice(0, 5).map((p) => {
    const { amount } = projectValue(p, key);
    return toRow(p, { usd: 0, ngn: 0, displayValue: `${amount.toFixed(2)}%` });
  });
  const lowestMargin = [...marginSorted]
    .reverse()
    .slice(0, 5)
    .map((p) => {
      const { amount } = projectValue(p, key);
      return toRow(p, { usd: 0, ngn: 0, displayValue: `${amount.toFixed(2)}%` });
    });

  const titles: Record<FinancialPanelKey, string> = {
    commission_ngn: 'Total Commission (NGN)',
    commission_usd: 'Total Commission (USD)',
    po_ngn: 'Total PO Value (₦)',
    margin_pct_usd: 'Margin % (USD)',
    margin_pct_ngn: 'Margin % (NGN)',
  };

  const summaryStats: SnapshotSummaryStat[] = [
    {
      label: titles[key],
      value: headline,
      sub: `${contributing.length.toLocaleString()} contributing project${
        contributing.length === 1 ? '' : 's'
      }`,
      tone: 'primary',
    },
  ];

  if (!isMargin) {
    summaryStats.push({
      label: 'Projects in scope',
      value: String(projects.length),
      sub: coverageLine(contributing.length, projects.length),
    });
  }

  const definition =
    key === 'commission_ngn' || key === 'commission_usd'
      ? `Total Commission is 5% of stored contract value (${
          currency === 'NGN' ? 'contractValueNGN' : 'contractValueUSD'
        }) — not margin value.`
      : key === 'po_ngn'
        ? 'Total PO Value (₦) is the sum of stored contractValueNGN across projects in scope.'
        : `Margin % is a simple average of each project's marginPercent${
            currency === 'USD' ? 'USD' : 'NGN'
          } (not weighted by contract value). Current average: ${avgPct.toFixed(2)}%.`;

  const rankedSections: NonNullable<ExecutiveSnapshotModel['rankedSections']> = [];

  if (isMargin) {
    rankedSections.push({
      title: 'Margin % by segment',
      groups: rankByCurrency(bySegment, currency, 8),
      filterKey: 'businessVerticals',
      showWon: false,
      extraQuery: hasQs,
    });
    rankedSections.push({
      title: 'Margin % by client',
      groups: rankByCurrency(byClient, currency, 8),
      filterKey: 'clientNames',
      showWon: false,
      extraQuery: hasQs,
    });
  } else {
    rankedSections.push({
      title: 'By business segment / vertical',
      groups: rankByCurrency(bySegment, currency, 8),
      filterKey: 'businessVerticals',
      showWon: true,
      extraQuery: hasQs,
    });
    rankedSections.push({
      title: 'By client',
      groups: rankByCurrency(byClient, currency, 8),
      filterKey: 'clientNames',
      showWon: true,
      extraQuery: hasQs,
    });
    rankedSections.push({
      title: 'Won vs open',
      groups: Array.from(byWonOpen.values()).filter((g) => g.count > 0),
      showWon: false,
      extraQuery: hasQs,
      // Won bar drills via metric; Open stays list-filtered by has only.
      metricOverride: undefined,
    });
  }

  return {
    title: titles[key],
    subtitle: definition,
    summaryStats,
    byStage: {},
    stageMode: 'none',
    showProbabilityBands: false,
    byEntity: [],
    showEntityBreakdown: false,
    rankedSections,
    topOpportunities: isMargin ? [] : topProjects,
    topOpportunitiesTitle: isMargin
      ? undefined
      : `Top projects by ${currency === 'NGN' ? 'NGN' : 'USD'} value`,
    marginExtremes: isMargin
      ? {
          highest: highestMargin,
          lowest: lowestMargin,
        }
      : undefined,
    dataCoverage:
      missingCount > 0
        ? {
            message: `${missingCount.toLocaleString()} project${
              missingCount === 1 ? '' : 's'
            } have no ${coverageFieldLabel(field)} and are not included in this total`,
            missingQuery: missingQs,
            missingCount,
          }
        : {
            message: `All ${projects.length.toLocaleString()} projects in scope have ${coverageFieldLabel(
              field
            )}.`,
            missingQuery: missingQs,
            missingCount: 0,
          },
    openAllQuery: hasQs,
    openAllLabel: `See all ${contributing.length.toLocaleString()} project${
      contributing.length === 1 ? '' : 's'
    }`,
  };
}

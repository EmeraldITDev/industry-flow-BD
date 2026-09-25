import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Handshake, Download, ChevronRight } from 'lucide-react';
import {
  partnersService,
  type PartnerTrackerMetrics,
  type PartnerTrackerRankRow,
} from '@/services/partners';
import { useCurrency } from '@/context/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  exportActiveZeroCsv,
  exportActiveZeroPdf,
  exportIncompleteCsv,
  exportIncompletePdf,
} from '@/lib/partnerTrackerExports';

function formatMoney(usd: number, ngn: number, preferUsd: boolean) {
  if (preferUsd) {
    if (usd > 0) return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (ngn > 0) return `₦${ngn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return '—';
  }
  if (ngn > 0) return `₦${ngn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (usd > 0) return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return '—';
}

function RankTable({
  rows,
  mode,
  empty,
}: {
  rows: PartnerTrackerRankRow[];
  mode: 'count' | 'volume';
  empty: string;
}) {
  const { currency } = useCurrency();
  const preferUsd = currency === 'USD';

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{empty}</p>;
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, idx) => (
        <Link
          key={row.id}
          to={`/projects?partner_id=${row.id}`}
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60 transition-colors"
        >
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground w-5">{idx + 1}.</span>
            <span className="truncate font-medium">{row.companyName}</span>
          </div>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {mode === 'count'
              ? `${row.linkedOpportunitiesCount} opp${row.linkedOpportunitiesCount === 1 ? '' : 's'}`
              : formatMoney(row.totalValueUsd, row.totalValueNgn, preferUsd)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function BreakdownBars({
  rows,
  onRowClick,
}: {
  rows: Array<{ key: string; label: string; count: number; pct: number }>;
  onRowClick?: (key: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No data for this breakdown.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const Comp = onRowClick ? 'button' : 'div';
        return (
          <Comp
            key={row.key}
            type={onRowClick ? 'button' : undefined}
            onClick={onRowClick ? () => onRowClick(row.key) : undefined}
            className={cn(
              'w-full text-left space-y-1.5',
              onRowClick && 'rounded-md hover:bg-accent/40 px-1 py-1 -mx-1 transition-colors'
            )}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.count}
                <span className="text-xs ml-1.5">({row.pct}%)</span>
              </span>
            </div>
            <Progress value={Math.min(100, row.pct)} className="h-2" />
          </Comp>
        );
      })}
    </div>
  );
}

function ExportMenu({
  onPdf,
  onCsv,
  disabled,
}: {
  onPdf: () => void | Promise<void>;
  onCsv: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="shrink-0">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            void onPdf();
          }}
        >
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCsv}>Export CSV / Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Partner Tracker metrics for Dashboard + Chairman's View.
 * Uses partner_opportunity pivot volume (same as Partner Tracker), not channel_partner text.
 *
 * variant="dashboard" — full operational detail (owner bars + incomplete profiles).
 * variant="chairman" — activation framing only; no incomplete card, no owner accountability.
 */
export function PartnerTrackerInsights({
  className,
  variant = 'dashboard',
}: {
  className?: string;
  variant?: 'dashboard' | 'chairman';
}) {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const preferUsd = currency === 'USD';
  const isChairman = variant === 'chairman';

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['partners-tracker-metrics'],
    queryFn: () => partnersService.getTrackerMetrics(),
    staleTime: 60_000,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" />
            Partner Tracker insights
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Linked opportunities via Partner Tracker (partner_opportunity pivot) — not the
            opportunity “channel partner” text field. Counts match Partner Tracker volume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/partners')}>
            Open Partner Tracker
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading partner metrics…
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load Partner Tracker metrics. Try refresh.
        </p>
      )}

      {data && (
        <>
          <div
            className={cn(
              'grid gap-3 sm:grid-cols-2',
              isChairman ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            )}
          >
            <MetricTile
              label={
                isChairman
                  ? 'Partnerships ready for activation'
                  : 'Active Partners · 0 opportunities'
              }
              value={String(data.activeWithZeroOpportunities.count)}
              hint={
                isChairman
                  ? 'Active Partners with no linked opportunities yet'
                  : 'Stage = Active Partner, no pivot links'
              }
              onClick={() =>
                navigate(
                  `/partners?relationshipStage=${encodeURIComponent('Active Partner')}&zeroLinks=1`
                )
              }
            />
            {!isChairman && (
              <MetricTile
                label="Incomplete profiles"
                value={String(data.incompleteProfiles.count)}
                hint="Missing contact person or email (Tracker badge)"
                onClick={() => navigate('/partners?incomplete=1')}
              />
            )}
            <MetricTile
              label="Top-1 volume share"
              value={`${data.concentration.top1Pct}%`}
              hint="Largest partner / all linked volume (USD)"
            />
            <MetricTile
              label="Top-3 volume share"
              value={`${data.concentration.top3Pct}%`}
              hint="Top 3 partners / all linked volume (USD)"
            />
            {!isChairman && (
              <MetricTile
                label="Valid Thru ≤ 90 days"
                value={String(data.validThruExpiring90Days.count)}
                hint="Agreements expiring within 90 days"
                onClick={() => navigate('/partners')}
              />
            )}
          </div>

          {isChairman ? (
            <ActivationReadyCard data={data.activeWithZeroOpportunities} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ActiveZeroCard data={data.activeWithZeroOpportunities} />
              <IncompleteProfilesCard
                incomplete={data.incompleteProfiles}
                dataGaps={data.dataGaps}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top partners by opportunity count</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Click a row to open linked opportunities (same pivot query).
                </p>
              </CardHeader>
              <CardContent>
                <RankTable
                  rows={data.byOpportunityCount}
                  mode="count"
                  empty="No partners with linked opportunities yet."
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top partners by linked volume</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Contract value sum on pivot-linked opportunities ({preferUsd ? 'USD' : 'NGN'}{' '}
                  preferred).
                </p>
              </CardHeader>
              <CardContent>
                <RankTable
                  rows={data.byVolume}
                  mode="volume"
                  empty="No linked opportunity volume recorded yet."
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const STRATEGIC_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Uncertain: 3,
};

function pickActivationFocus(
  partners: PartnerTrackerMetrics['activeWithZeroOpportunities']['partners'],
  limit = 2
) {
  const ranked = [...partners].sort((a, b) => {
    const ra = STRATEGIC_RANK[String(a.strategicValue ?? '')] ?? 99;
    const rb = STRATEGIC_RANK[String(b.strategicValue ?? '')] ?? 99;
    if (ra !== rb) return ra - rb;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return ranked.slice(0, limit).map((p) => {
    const value = p.strategicValue?.trim();
    const reason =
      value && STRATEGIC_RANK[value] !== undefined
        ? `${value} strategic value`
        : 'Recently onboarded';
    return { ...p, focusReason: reason };
  });
}

/** Chairman's View — forward-looking activation signal (no owner bars). */
function ActivationReadyCard({
  data,
}: {
  data: PartnerTrackerMetrics['activeWithZeroOpportunities'];
}) {
  const navigate = useNavigate();
  const seeAllHref = `/partners?relationshipStage=${encodeURIComponent('Active Partner')}&zeroLinks=1`;
  const focus = pickActivationFocus(data.partners, 2);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Partnerships ready for activation</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {data.count} Active Partners with no linked opportunities yet
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <button
          type="button"
          onClick={() => navigate(seeAllHref)}
          className="w-full text-left rounded-lg border border-primary/30 bg-primary/5 p-4 hover:border-primary/60 transition-colors"
        >
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {data.count}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Active Partners with no linked opportunities yet
          </p>
        </button>

        {focus.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Where to focus next
            </p>
            <div className="space-y-2">
              {focus.map((p) => (
                <Link
                  key={p.id}
                  to={`/partners/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:border-primary/60 transition-colors"
                >
                  <span className="truncate font-medium">{p.companyName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{p.focusReason}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => navigate(seeAllHref)}
        >
          Review all {data.count}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveZeroCard({
  data,
}: {
  data: PartnerTrackerMetrics['activeWithZeroOpportunities'];
}) {
  const navigate = useNavigate();
  const seeAllHref = `/partners?relationshipStage=${encodeURIComponent('Active Partner')}&zeroLinks=1`;
  const preview = data.partners.slice(0, 3);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Active Partners · no linked opportunities</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Stage = Active Partner with zero Partner Tracker links. Breakdown by relationship
            owner (multi-owner partners appear under each owner).
          </p>
        </div>
        <ExportMenu
          onPdf={() => exportActiveZeroPdf(data)}
          onCsv={() => exportActiveZeroCsv(data)}
          disabled={data.count === 0}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {data.count}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            active partners with no linked opportunities
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            By relationship owner
          </p>
          <BreakdownBars
            rows={(data.byOwner ?? []).slice(0, 6).map((row) => ({
              key: row.ownerId == null ? 'unassigned' : String(row.ownerId),
              label: row.ownerName,
              count: row.count,
              pct: row.pct,
            }))}
            onRowClick={(key) => {
              const ownerParam =
                key === 'unassigned' ? 'unassigned' : encodeURIComponent(key);
              navigate(`${seeAllHref}&ownerId=${ownerParam}`);
            }}
          />
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Examples
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.map((p) => (
                <Link
                  key={p.id}
                  to={`/partners/${p.id}`}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/60 hover:text-primary transition-colors"
                >
                  {p.companyName}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => navigate(seeAllHref)}
        >
          See all {data.count}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function IncompleteProfilesCard({
  incomplete,
  dataGaps,
}: {
  incomplete: PartnerTrackerMetrics['incompleteProfiles'];
  dataGaps: PartnerTrackerMetrics['dataGaps'];
}) {
  const navigate = useNavigate();
  const preview = incomplete.partners.slice(0, 3);
  const gapRows = (dataGaps?.fields ?? []).slice(0, 6);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Incomplete partner profiles</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Headline matches the Partner Tracker Incomplete badge (contact person and/or email).
            Data-gap bars below are a separate inventory across all partners.
          </p>
        </div>
        <ExportMenu
          onPdf={() => exportIncompletePdf(incomplete, dataGaps)}
          onCsv={() => exportIncompleteCsv(incomplete, dataGaps)}
          disabled={incomplete.count === 0 && (dataGaps?.partnersScanned ?? 0) === 0}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {incomplete.count}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            incomplete profiles (contact person and/or email missing)
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Data gaps across all {dataGaps?.partnersScanned ?? 0} partners
          </p>
          <p className="text-[11px] text-muted-foreground mb-3">
            Not the same number as the headline — field inventory for the whole book.
          </p>
          <BreakdownBars
            rows={gapRows.map((f) => ({
              key: f.key,
              label: f.label,
              count: f.count,
              pct: f.pct,
            }))}
          />
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Examples (Tracker-incomplete)
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.map((p) => (
                <Link
                  key={p.id}
                  to={`/partners/${p.id}`}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/60 hover:text-primary transition-colors"
                >
                  {p.companyName}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => navigate('/partners?incomplete=1')}
        >
          See all {incomplete.count}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-3 text-left',
        onClick && 'hover:border-primary/40 hover:bg-accent/30 transition-colors cursor-pointer'
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </Comp>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Handshake } from 'lucide-react';
import { partnersService, type PartnerTrackerRankRow } from '@/services/partners';
import { useCurrency } from '@/context/CurrencyContext';
import { cn } from '@/lib/utils';

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

/**
 * Partner Tracker metrics for Dashboard + Chairman's View.
 * Uses partner_opportunity pivot volume (same as Partner Tracker), not channel_partner text.
 */
export function PartnerTrackerInsights({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const preferUsd = currency === 'USD';

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Active Partners · 0 opportunities"
              value={String(data.activeWithZeroOpportunities.count)}
              hint="Stage = Active Partner, no pivot links"
              onClick={() =>
                navigate(
                  `/partners?relationshipStage=${encodeURIComponent('Active Partner')}`
                )
              }
            />
            <MetricTile
              label="Incomplete profiles"
              value={String(data.incompleteProfiles.count)}
              hint="Missing contact person or email"
              onClick={() => navigate('/partners')}
            />
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
            <MetricTile
              label="Valid Thru ≤ 90 days"
              value={String(data.validThruExpiring90Days.count)}
              hint="Agreements expiring within 90 days"
              onClick={() => navigate('/partners')}
            />
          </div>

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

          {(data.activeWithZeroOpportunities.partners.length > 0 ||
            data.incompleteProfiles.partners.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.activeWithZeroOpportunities.partners.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Active Partners with no linked opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {data.activeWithZeroOpportunities.partners.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        to={`/partners/${p.id}`}
                        className="block text-sm truncate hover:text-primary"
                      >
                        {p.companyName}
                      </Link>
                    ))}
                    {data.activeWithZeroOpportunities.count > 8 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{data.activeWithZeroOpportunities.count - 8} more
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              {data.incompleteProfiles.partners.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Incomplete partner profiles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {data.incompleteProfiles.partners.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        to={`/partners/${p.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:text-primary"
                      >
                        <span className="truncate">{p.companyName}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Incomplete
                        </Badge>
                      </Link>
                    ))}
                    {data.incompleteProfiles.count > 8 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{data.incompleteProfiles.count - 8} more
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
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

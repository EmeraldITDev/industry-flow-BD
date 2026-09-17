import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { AccountSnapshot } from '@/lib/executive/analytics';
import { fmtNgn, fmtPercent, fmtUsd } from '@/lib/executive/format';
import {
  ExecutiveSnapshotModel,
  stageBadgeEntries,
} from '@/lib/executive/metricPanel';
import { ExecutiveMetric } from './ExecutiveMetric';
import { OpportunityTable } from './OpportunityTable';
import { RankedList } from './RankedList';

export interface SnapshotExtraBadge {
  label: string;
  onClick?: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: ExecutiveSnapshotModel | null;
  loading?: boolean;
  error?: boolean;
  extraBadges?: SnapshotExtraBadge[];
  /** Pipeline USD/NGN toggle — parent owns currency state. */
  onCurrencyChange?: (currency: 'USD' | 'NGN') => void;
}

export function ExecutiveSnapshotSheet({
  open,
  onOpenChange,
  model,
  loading,
  error,
  extraBadges,
  onCurrencyChange,
}: Props) {
  const navigate = useNavigate();

  const stageHref = (stage: string) => {
    if (!model) return '/projects';
    const base = new URLSearchParams(model.openAllQuery);
    if (stage === 'lost') {
      base.set('metric', 'all');
      base.set('pipelineStages', JSON.stringify(['lost']));
    } else {
      // Stage drills are snapshot metrics — drop population filters that conflict.
      base.set('metric', `stage:${stage}`);
      base.delete('pipelineStages');
      base.delete('dealProbabilities');
    }
    return `/projects?${base.toString()}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-5">
            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Could not load this snapshot. Try refreshing the dashboard.
              </p>
            )}

            {!loading && !error && model && (
              <>
                <SheetHeader className="text-left space-y-1">
                  <SheetTitle>{model.title}</SheetTitle>
                  {model.subtitle && (
                    <p className="text-xs text-muted-foreground">{model.subtitle}</p>
                  )}
                </SheetHeader>

                {model.currencyToggle && onCurrencyChange && (
                  <div className="flex gap-2">
                    {(['USD', 'NGN'] as const).map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={model.currencyToggle?.active === c ? 'default' : 'outline'}
                        onClick={() => onCurrencyChange(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                )}

                <div
                  className={
                    model.summaryStats.length === 1
                      ? 'grid gap-3 grid-cols-1'
                      : 'grid gap-3 grid-cols-2'
                  }
                >
                  {model.summaryStats.map((stat) => (
                    <ExecutiveMetric
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      sub={stat.sub}
                      tone={stat.tone}
                      drillTo={stat.drillTo}
                    />
                  ))}
                </div>

                {model.stageMode !== 'none' && (() => {
                  const stageEntries = stageBadgeEntries(model.byStage, model.stageMode);
                  return (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {model.stageMode === 'won'
                        ? 'Won-stage mix'
                        : model.stageMode === 'late'
                          ? 'Late-stage mix'
                          : 'Stage distribution'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stageEntries.map(({ stage, label, count }) => (
                        <Badge
                          key={stage}
                          variant="outline"
                          className="font-normal cursor-pointer hover:bg-muted"
                          onClick={() => navigate(stageHref(stage))}
                        >
                          {label}: {count}
                        </Badge>
                      ))}
                      {stageEntries.length === 0 && (
                        <p className="text-xs text-muted-foreground">No stage breakdown recorded.</p>
                      )}
                    </div>

                    {(model.showProbabilityBands && model.byProbability) ||
                    model.probabilityContext ||
                    (extraBadges && extraBadges.length > 0) ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {model.showProbabilityBands &&
                          model.byProbability &&
                          (['high', 'medium', 'low'] as const).map((band) => (
                            <Badge
                              key={band}
                              variant="outline"
                              className="font-normal capitalize cursor-pointer hover:bg-muted"
                              onClick={() => {
                                const params = new URLSearchParams(model.openAllQuery);
                                params.set('dealProbabilities', JSON.stringify([band]));
                                navigate(`/projects?${params.toString()}`);
                              }}
                            >
                              {band} probability: {model.byProbability?.[band] ?? 0}
                            </Badge>
                          ))}
                        {model.showProbabilityBands && model.byProbability && (
                          <Badge variant="outline" className="font-normal">
                            Avg probability{' '}
                            {fmtPercent(
                              (() => {
                                const total =
                                  (model.byProbability.high ?? 0) +
                                  (model.byProbability.medium ?? 0) +
                                  (model.byProbability.low ?? 0);
                                if (!total) return 0;
                                return (
                                  ((model.byProbability.high ?? 0) * 0.75 +
                                    (model.byProbability.medium ?? 0) * 0.45 +
                                    (model.byProbability.low ?? 0) * 0.15) /
                                  total
                                );
                              })()
                            )}
                          </Badge>
                        )}
                        {model.probabilityContext && (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            {model.probabilityContext}
                          </Badge>
                        )}
                        {extraBadges?.map((badge) => (
                          <Badge
                            key={badge.label}
                            variant="outline"
                            className={
                              badge.onClick
                                ? 'font-normal cursor-pointer hover:bg-muted'
                                : 'font-normal'
                            }
                            onClick={badge.onClick}
                          >
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  );
                })()}

                {model.showEntityBreakdown && model.byEntity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Breakdown by entity</h4>
                    <RankedList
                      groups={model.byEntity}
                      filterKey="clientNames"
                      metricOverride={model.entityMetricOverride ?? 'active'}
                      extraQuery={model.entityExtraQuery}
                      limit={6}
                      showWon={model.stageMode === 'won'}
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-1">Top opportunities by value</h4>
                  <OpportunityTable rows={model.topOpportunities} limit={8} />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/projects?${model.openAllQuery}`)}
                >
                  {model.openAllLabel}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/** Convert a strategic-account snapshot into the shared sheet model. */
export function accountSnapshotToModel(account: AccountSnapshot): ExecutiveSnapshotModel {
  const drillFor = (metric?: string) => {
    const params = new URLSearchParams();
    if (metric) params.set('metric', metric);
    params.set('clientNames', JSON.stringify(account.clientNames));
    return params.toString();
  };

  return {
    title: `${account.label} — Executive Snapshot`,
    subtitle: `${account.clientNames.length} client record${
      account.clientNames.length === 1 ? '' : 's'
    }: ${account.clientNames.join(', ')}`,
    summaryStats: [
      { label: 'Opportunities', value: String(account.count), drillTo: drillFor('all') },
      {
        label: 'Won / in execution',
        value: String(account.won),
        sub: `${fmtUsd(account.wonUsd)} · ${fmtNgn(account.wonNgn)}`,
        drillTo: drillFor('won'),
      },
      {
        label: 'Pipeline (USD)',
        value: fmtUsd(account.usd),
        drillTo: drillFor('active'),
      },
      {
        label: 'Pipeline (NGN)',
        value: fmtNgn(account.ngn),
        drillTo: drillFor('active'),
      },
      {
        label: 'In proposal',
        value: String(account.proposal),
        drillTo: drillFor('stage:proposal'),
      },
      {
        label: 'In negotiation',
        value: String(account.negotiation),
        drillTo: drillFor('stage:negotiation'),
      },
      {
        label: 'Close to winning',
        value: String(account.nearConversion),
        tone: 'primary',
        drillTo: drillFor('nearConversion'),
      },
    ],
    byStage: account.byStage,
    stageMode: 'full',
    byProbability: account.byProbability,
    showProbabilityBands: true,
    byEntity: account.byEntity,
    showEntityBreakdown: account.byEntity.length > 1,
    entityMetricOverride: 'all',
    topOpportunities: account.topOpportunities,
    openAllQuery: drillFor('all'),
    openAllLabel: `Open all ${account.label} opportunities`,
  };
}

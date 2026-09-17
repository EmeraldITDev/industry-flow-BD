import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountSnapshot, ExecutiveIntelligence, STAGE_LABELS } from '@/lib/executive/analytics';
import { fmtNgn, fmtPercent, fmtUsd } from '@/lib/executive/format';
import { OpportunityTable } from './OpportunityTable';
import { RankedList } from './RankedList';
import { ExecutiveMetric } from './ExecutiveMetric';
import { Settings2, Star } from 'lucide-react';

interface Props {
  data: ExecutiveIntelligence;
  onManageGroups: () => void;
}

export function StrategicAccounts({ data, onManageGroups }: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AccountSnapshot | null>(null);

  const configured = data.accounts.filter((a) => a.isConfiguredGroup && a.count > 0);
  const surfaced = data.accounts.filter((a) => !a.isConfiguredGroup).slice(0, 8);
  const drillFor = (account: AccountSnapshot, metric?: string) => {
    const params = new URLSearchParams();
    if (metric) params.set('metric', metric);
    params.set('clientNames', JSON.stringify(account.clientNames));
    return params.toString();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Strategic Accounts</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configured account groups combine related client entities without changing the underlying
              records. Other major accounts are surfaced by pipeline value.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onManageGroups} className="shrink-0">
            <Settings2 className="w-4 h-4 mr-1.5" />
            Manage groups
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {configured.map((account) => (
              <button
                key={account.key}
                type="button"
                onClick={() => setSelected(account)}
                className="text-left rounded-lg border border-primary/30 bg-primary/5 p-4 hover:border-primary/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-sm">{account.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {account.count} opportunities · {account.won} won · {account.negotiation} in negotiation
                </p>
                <div className="flex gap-3 mt-2 text-sm tabular-nums">
                  {account.usd > 0 && <span className="font-semibold">{fmtUsd(account.usd)}</span>}
                  {account.ngn > 0 && <span className="text-muted-foreground">{fmtNgn(account.ngn)}</span>}
                </div>
              </button>
            ))}
            {!configured.length && (
              <p className="text-sm text-muted-foreground">
                No opportunities currently match the configured account groups.
              </p>
            )}
          </div>

          {surfaced.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
                Other major accounts by pipeline value
              </p>
              <div className="flex flex-wrap gap-2">
                {surfaced.map((account) => (
                  <button
                    key={account.key}
                    type="button"
                    onClick={() => setSelected(account)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/60 transition-colors"
                  >
                    <span className="font-medium">{account.label}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {account.count} · {account.usd > 0 ? fmtUsd(account.usd) : fmtNgn(account.ngn)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          {selected && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-5">
                <SheetHeader className="text-left space-y-1">
                  <SheetTitle>{selected.label} — Executive Snapshot</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {selected.clientNames.length} client record
                    {selected.clientNames.length === 1 ? '' : 's'}: {selected.clientNames.join(', ')}
                  </p>
                </SheetHeader>

                <div className="grid gap-3 grid-cols-2">
                  <ExecutiveMetric
                    label="Opportunities"
                    value={String(selected.count)}
                    drillTo={drillFor(selected, 'all')}
                  />
                  <ExecutiveMetric
                    label="Won / in execution"
                    value={String(selected.won)}
                    sub={`${fmtUsd(selected.wonUsd)} · ${fmtNgn(selected.wonNgn)}`}
                    drillTo={drillFor(selected, 'won')}
                  />
                  <ExecutiveMetric
                    label="Pipeline (USD)"
                    value={fmtUsd(selected.usd)}
                    drillTo={drillFor(selected, 'active')}
                  />
                  <ExecutiveMetric
                    label="Pipeline (NGN)"
                    value={fmtNgn(selected.ngn)}
                    drillTo={drillFor(selected, 'active')}
                  />
                  <ExecutiveMetric
                    label="In proposal"
                    value={String(selected.proposal)}
                    drillTo={drillFor(selected, 'stage:proposal')}
                  />
                  <ExecutiveMetric
                    label="In negotiation"
                    value={String(selected.negotiation)}
                    drillTo={drillFor(selected, 'stage:negotiation')}
                  />
                  <ExecutiveMetric
                    label="Close to winning"
                    value={String(selected.nearConversion)}
                    tone="primary"
                    drillTo={drillFor(selected, 'nearConversion')}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Stage distribution</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.byStage).map(([stage, count]) => (
                      <Badge
                        key={stage}
                        variant="outline"
                        className="font-normal cursor-pointer hover:bg-muted"
                        onClick={() =>
                          navigate(
                            `/projects?${drillFor(selected, stage === 'lost' ? 'all' : `stage:${stage}`)}${
                              stage === 'lost'
                                ? `&pipelineStages=${encodeURIComponent(JSON.stringify(['lost']))}`
                                : ''
                            }`
                          )
                        }
                      >
                        {STAGE_LABELS[stage] ?? stage}: {count}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['high', 'medium', 'low'] as const).map((band) => (
                      <Badge
                        key={band}
                        variant="outline"
                        className="font-normal capitalize cursor-pointer hover:bg-muted"
                        onClick={() =>
                          navigate(
                            `/projects?${drillFor(selected, 'active')}&dealProbabilities=${encodeURIComponent(JSON.stringify([band]))}`
                          )
                        }
                      >
                        {band} probability: {selected.byProbability[band]}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="font-normal">
                      Avg probability {fmtPercent(selected.avgProbability)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-normal cursor-pointer hover:bg-muted"
                      onClick={() => {
                        const params = drillFor(selected, 'all');
                        const period =
                          data.window?.start && data.window?.end
                            ? `&from=${encodeURIComponent(data.window.start)}&to=${encodeURIComponent(data.window.end)}`
                            : '';
                        navigate(`/projects?${params}${period}`);
                      }}
                    >
                      {selected.newInPeriod} new this period
                    </Badge>
                  </div>
                </div>

                {selected.byEntity.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Breakdown by entity</h4>
                    <RankedList
                      groups={selected.byEntity}
                      filterKey="clientNames"
                      metricOverride="all"
                      limit={6}
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-1">Top opportunities by value</h4>
                  <OpportunityTable rows={selected.topOpportunities} limit={8} />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/projects?${drillFor(selected, 'all')}`)}
                >
                  Open all {selected.label} opportunities
                </Button>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

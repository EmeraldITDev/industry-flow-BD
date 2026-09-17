import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountSnapshot, ExecutiveIntelligence } from '@/lib/executive/analytics';
import { fmtNgn, fmtUsd } from '@/lib/executive/format';
import {
  ExecutiveSnapshotSheet,
  accountSnapshotToModel,
} from './ExecutiveSnapshotSheet';
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

  const model = useMemo(
    () => (selected ? accountSnapshotToModel(selected) : null),
    [selected]
  );

  const periodQs =
    data.window?.start && data.window?.end
      ? `from=${encodeURIComponent(String(data.window.start).slice(0, 10))}&to=${encodeURIComponent(String(data.window.end).slice(0, 10))}`
      : '';

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

      <ExecutiveSnapshotSheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        model={model}
        extraBadges={
          selected
            ? [
                {
                  label: `${selected.newInPeriod} new this period`,
                  onClick: periodQs
                    ? () =>
                        navigate(
                          `/projects?metric=all&clientNames=${encodeURIComponent(
                            JSON.stringify(selected.clientNames)
                          )}&${periodQs}`
                        )
                    : undefined,
                },
              ]
            : undefined
        }
      />
    </>
  );
}

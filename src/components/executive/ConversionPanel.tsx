import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { fmtMonthLabel, fmtNgn, fmtUsd } from '@/lib/executive/format';
import {
  ReportingPeriodKey,
  resolveReportingRange,
  reportingParams,
  reportingSearch,
} from '@/lib/executive/reportingPeriod';
import { metricsService } from '@/services/metrics';
import { ExecutiveMetric } from './ExecutiveMetric';
import { RankedList } from './RankedList';
import { ReportingRangeFilter } from './ReportingRangeFilter';

export function ConversionPanel({ data }: { data: ExecutiveIntelligence }) {
  const [preset, setPreset] = useState<ReportingPeriodKey>('thisYear');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const range = useMemo(
    () => resolveReportingRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  );
  const params = reportingParams(range);
  const rangeQs = reportingSearch(range);

  const { data: summary, isError } = useQuery({
    queryKey: ['metrics-summary', range.from, range.to],
    queryFn: () => metricsService.summary(params),
    staleTime: 60 * 1000,
  });

  const conversion = summary?.conversion ?? (isError ? data.conversion : null);
  const showCalendarSplit = preset === 'thisYear' || preset === 'ytd';
  const maxMonth = Math.max(...(conversion?.byMonth ?? []).map((m: { count: number }) => m.count), 1);
  const wonLabel =
    preset === 'thisYear'
      ? 'Won this year'
      : preset === 'prevYear'
        ? 'Won previous year'
        : preset === 'ytd'
          ? 'Won year to date'
          : 'Won in range';

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div>
          <CardTitle className="text-base">Commercial Performance — Deals Won</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            "Won" covers opportunities at Approval, Execution or Closure. Dates are the project's
            Start Date (Intake Date if Start Date is blank) — the same field the cards and
            drill-downs query together.
          </p>
        </div>
        <ReportingRangeFilter
          range={range}
          onPreset={(key) => {
            setPreset(key);
            setCustomFrom(undefined);
            setCustomTo(undefined);
          }}
          onCustom={({ from, to }) => {
            setPreset('custom');
            setCustomFrom(from);
            setCustomTo(to);
          }}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <ExecutiveMetric
            label={wonLabel}
            value={String(conversion?.wonYear ?? 0)}
            sub={
              showCalendarSplit
                ? `${conversion?.wonQuarter ?? 0} this quarter · ${conversion?.wonMonth ?? 0} this month`
                : `${range.from} – ${range.to}`
            }
            tone="primary"
            drillTo={`metric=won&${rangeQs}`}
          />
          <ExecutiveMetric
            label="Won value (USD)"
            value={fmtUsd(conversion?.wonUsd ?? 0)}
            sub="Secured contracts"
            drillTo={`metric=won&${rangeQs}`}
          />
          <ExecutiveMetric
            label="Won value (NGN)"
            value={fmtNgn(conversion?.wonNgn ?? 0)}
            sub="Secured contracts"
            drillTo={`metric=won&${rangeQs}`}
          />
          <ExecutiveMetric
            label="In execution"
            value={String(conversion?.inExecution ?? 0)}
            sub={`Avg won deal ${fmtUsd(conversion?.avgWonUsd ?? 0)} / ${fmtNgn(conversion?.avgWonNgn ?? 0)}`}
            drillTo="metric=stage:execution"
          />
        </div>

        {conversion?.byMonth?.length > 1 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Win trend by month
            </p>
            <div className="flex items-end gap-2 h-28">
              {conversion.byMonth.map((m: { month: string; count: number; usd: number; ngn: number }) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{m.count}</span>
                  <div
                    className="w-full bg-primary/70 rounded-t"
                    style={{ height: `${Math.max(4, (m.count / maxMonth) * 80)}px` }}
                    title={`${fmtUsd(m.usd)} / ${fmtNgn(m.ngn)}`}
                  />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {fmtMonthLabel(m.month)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="client">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="client">By client</TabsTrigger>
            <TabsTrigger value="sector">By sector</TabsTrigger>
            <TabsTrigger value="vertical">By vertical</TabsTrigger>
            <TabsTrigger value="product">By product</TabsTrigger>
            <TabsTrigger value="partner">By partner</TabsTrigger>
          </TabsList>
          <TabsContent value="client" className="mt-3">
            <RankedList
              groups={conversion?.byClient ?? []}
              filterKey="clientNames"
              metricOverride="won"
              extraQuery={rangeQs}
              showWon={false}
            />
          </TabsContent>
          <TabsContent value="sector" className="mt-3">
            <RankedList
              groups={conversion?.bySector ?? []}
              filterKey="sectors"
              metricOverride="won"
              extraQuery={rangeQs}
              showWon={false}
            />
          </TabsContent>
          <TabsContent value="vertical" className="mt-3">
            <RankedList
              groups={conversion?.byVertical ?? []}
              filterKey="businessVerticals"
              metricOverride="won"
              extraQuery={rangeQs}
              showWon={false}
            />
          </TabsContent>
          <TabsContent value="product" className="mt-3">
            <RankedList groups={conversion?.byProduct ?? []} extraQuery={rangeQs} showWon={false} />
          </TabsContent>
          <TabsContent value="partner" className="mt-3">
            <RankedList
              groups={conversion?.byPartner ?? []}
              filterKey="channelPartners"
              metricOverride="won"
              extraQuery={rangeQs}
              showWon={false}
              emptyMessage="No partner data recorded against won opportunities."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

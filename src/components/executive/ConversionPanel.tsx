import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence, WON_STAGES } from '@/lib/executive/analytics';
import { fmtMonthLabel, fmtNgn, fmtUsd } from '@/lib/executive/format';
import { ExecutiveMetric } from './ExecutiveMetric';
import { OpportunityTable } from './OpportunityTable';
import { RankedList } from './RankedList';

const wonDrill = `pipelineStages=${encodeURIComponent(JSON.stringify(WON_STAGES))}`;

export function ConversionPanel({ data }: { data: ExecutiveIntelligence }) {
  const { conversion } = data;
  const maxMonth = Math.max(...conversion.byMonth.map((m) => m.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Performance — Deals Won</CardTitle>
        <p className="text-xs text-muted-foreground">
          "Won" covers opportunities at Approval, Execution or Closure, matching the portal's existing
          business logic. Dates are based on the last recorded update.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <ExecutiveMetric
            label="Won this year"
            value={String(conversion.wonYear)}
            sub={`${conversion.wonQuarter} this quarter · ${conversion.wonMonth} this month`}
            tone="primary"
            drillTo={wonDrill}
          />
          <ExecutiveMetric label="Won value (USD)" value={fmtUsd(conversion.wonUsd)} sub="Secured contracts" />
          <ExecutiveMetric label="Won value (NGN)" value={fmtNgn(conversion.wonNgn)} sub="Secured contracts" />
          <ExecutiveMetric
            label="In execution"
            value={String(conversion.inExecution)}
            sub={`Avg won deal ${fmtUsd(conversion.avgWonUsd)} / ${fmtNgn(conversion.avgWonNgn)}`}
            drillTo={`pipelineStages=${encodeURIComponent(JSON.stringify(['execution']))}`}
          />
        </div>

        {conversion.byMonth.length > 1 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
              Win trend by month
            </p>
            <div className="flex items-end gap-2 h-28">
              {conversion.byMonth.map((m) => (
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

        <Tabs defaultValue="recent">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="recent">Recent wins</TabsTrigger>
            <TabsTrigger value="client">By client</TabsTrigger>
            <TabsTrigger value="sector">By sector</TabsTrigger>
            <TabsTrigger value="vertical">By vertical</TabsTrigger>
            <TabsTrigger value="product">By product</TabsTrigger>
            <TabsTrigger value="partner">By partner</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="mt-3">
            <OpportunityTable rows={conversion.recentWins} emptyMessage="No won opportunities recorded." />
          </TabsContent>
          <TabsContent value="client" className="mt-3">
            <RankedList groups={conversion.byClient} filterKey="clientNames" showWon={false} />
          </TabsContent>
          <TabsContent value="sector" className="mt-3">
            <RankedList groups={conversion.bySector} filterKey="sectors" showWon={false} />
          </TabsContent>
          <TabsContent value="vertical" className="mt-3">
            <RankedList groups={conversion.byVertical} filterKey="businessVerticals" showWon={false} />
          </TabsContent>
          <TabsContent value="product" className="mt-3">
            <RankedList groups={conversion.byProduct} showWon={false} />
          </TabsContent>
          <TabsContent value="partner" className="mt-3">
            <RankedList
              groups={conversion.byPartner}
              filterKey="channelPartners"
              showWon={false}
              emptyMessage="No partner data recorded against won opportunities."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

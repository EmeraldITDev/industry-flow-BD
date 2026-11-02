import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { OpportunityTable } from './OpportunityTable';

export function MovementPanel({ data }: { data: ExecutiveIntelligence }) {
  const { movement, window } = data;
  const historyAvailable = Boolean(movement.historyAvailable);
  const transitions = movement.stageTransitions ?? [];
  const coverageStart = movement.stageHistoryCoverageStart;
  const selectedStart = window.start
    ? window.start instanceof Date
      ? `${window.start.getFullYear()}-${String(window.start.getMonth() + 1).padStart(2, '0')}-${String(window.start.getDate()).padStart(2, '0')}`
      : String(window.start).slice(0, 10)
    : null;
  const predatesEventTracking = Boolean(
    coverageStart && (!selectedStart || selectedStart < coverageStart)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Activity & Pipeline Movement</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {window.label.toLowerCase()}.{' '}
          New opportunities are grouped by reporting date (Start Date, falling back to Intake Date).
          Won rows use the first recorded won event, or the win date when no won event exists.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!historyAvailable ? (
          <p role="status" className="rounded-md border border-border p-3 text-xs text-muted-foreground">
            No stage-event history is available. An empty transition list does not mean no stage
            movement occurred.
          </p>
        ) : predatesEventTracking ? (
          <p role="status" className="rounded-md border border-border p-3 text-xs text-muted-foreground">
            Recorded stage-event history begins {coverageStart}. Transitions before that date are
            unavailable; an empty list for the earlier period does not mean there was no movement.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Stage transitions shown below are recorded commercial events and may not include
            unrecorded history.
          </p>
        )}
        {historyAvailable && transitions.length > 0 && (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium mb-2">Recorded stage transitions this period</p>
            <ul className="space-y-1">
              {transitions.map((t) => (
                <li key={`${t.from}-${t.to}`} className="text-xs text-muted-foreground">
                  {(t.from || '—')} → {(t.to || '—')}: {t.count}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Tabs defaultValue="created">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="created">New by reporting date ({movement.created.length})</TabsTrigger>
            <TabsTrigger value="won">Won ({movement.won.length})</TabsTrigger>
            <TabsTrigger value="updated">Updated ({movement.updated.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({movement.overdue.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="created" className="mt-3">
            <OpportunityTable rows={movement.created} emptyMessage="No opportunities have a reporting date in this period." />
          </TabsContent>
          <TabsContent value="won" className="mt-3">
            <OpportunityTable rows={movement.won} emptyMessage="No event-confirmed or date-only wins were recorded in this period." />
          </TabsContent>
          <TabsContent value="updated" className="mt-3">
            <OpportunityTable rows={movement.updated} emptyMessage="No existing opportunities were updated in this period." />
          </TabsContent>
          <TabsContent value="overdue" className="mt-3">
            <OpportunityTable rows={movement.overdue} emptyMessage="No opportunities are past their expected close date." />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

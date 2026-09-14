import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { OpportunityTable } from './OpportunityTable';

export function MovementPanel({ data }: { data: ExecutiveIntelligence }) {
  const { movement, window } = data;
  const historyAvailable = Boolean((movement as any).historyAvailable);
  const transitions = ((movement as any).stageTransitions as any[]) ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Activity & Pipeline Movement</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {window.label.toLowerCase()}.{' '}
          {historyAvailable
            ? 'Stage transitions below are taken from recorded commercial events.'
            : 'Creation and last-update dates are available now; stage-by-stage history will populate as opportunities are updated going forward.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {historyAvailable && transitions.length > 0 && (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium mb-2">Stage transitions this period</p>
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
            <TabsTrigger value="created">New ({movement.created.length})</TabsTrigger>
            <TabsTrigger value="won">Won ({movement.won.length})</TabsTrigger>
            <TabsTrigger value="updated">Updated ({movement.updated.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({movement.overdue.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="created" className="mt-3">
            <OpportunityTable rows={movement.created} emptyMessage="No opportunities were created in this period." />
          </TabsContent>
          <TabsContent value="won" className="mt-3">
            <OpportunityTable rows={movement.won} emptyMessage="No opportunities were secured in this period." />
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

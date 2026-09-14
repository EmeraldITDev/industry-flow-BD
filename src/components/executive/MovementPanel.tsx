import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { OpportunityTable } from './OpportunityTable';

export function MovementPanel({ data }: { data: ExecutiveIntelligence }) {
  const { movement, window } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Activity & Pipeline Movement</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {window.label.toLowerCase()}. The portal records creation and last-update dates only,
          so stage-by-stage movement history is not yet available.
        </p>
      </CardHeader>
      <CardContent>
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

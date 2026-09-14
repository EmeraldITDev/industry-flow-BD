import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { OpportunityTable } from './OpportunityTable';

export function TopOpportunitiesPanel({ data }: { data: ExecutiveIntelligence }) {
  const t = data.topOpportunities;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Executive Deal Monitor</CardTitle>
        <p className="text-xs text-muted-foreground">
          Prioritised by stage, probability, value, expected close date and recency — not simply the first
          records in the list.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="largest">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="largest">Largest</TabsTrigger>
            <TabsTrigger value="closest">Closest to winning</TabsTrigger>
            <TabsTrigger value="probability">Highest probability</TabsTrigger>
            <TabsTrigger value="won">Recently won</TabsTrigger>
            <TabsTrigger value="attention">Requiring attention</TabsTrigger>
            <TabsTrigger value="updated">Recently updated</TabsTrigger>
          </TabsList>
          <TabsContent value="largest" className="mt-3">
            <OpportunityTable rows={t.largest} />
          </TabsContent>
          <TabsContent value="closest" className="mt-3">
            <OpportunityTable rows={t.closest} />
          </TabsContent>
          <TabsContent value="probability" className="mt-3">
            <OpportunityTable rows={t.highestProbability} />
          </TabsContent>
          <TabsContent value="won" className="mt-3">
            <OpportunityTable rows={t.recentlyWon} />
          </TabsContent>
          <TabsContent value="attention" className="mt-3">
            <OpportunityTable rows={t.attention} emptyMessage="Nothing currently flagged for attention." />
          </TabsContent>
          <TabsContent value="updated" className="mt-3">
            <OpportunityTable rows={t.recentlyUpdated} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

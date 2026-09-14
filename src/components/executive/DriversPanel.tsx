import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { RankedList } from './RankedList';

export function DriversPanel({ data }: { data: ExecutiveIntelligence }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Drivers</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked by pipeline value. Where an opportunity carries several products or sub-products, its
          value is split across them so totals are never inflated.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="partners">Partners / Suppliers</TabsTrigger>
            <TabsTrigger value="verticals">Business Verticals</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="subproducts">Sub-products</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-4">
            <RankedList groups={data.clients} filterKey="clientNames" limit={10} />
          </TabsContent>
          <TabsContent value="partners" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Based on the recorded channel partner, falling back to OEM where no partner is recorded.
            </p>
            <RankedList
              groups={data.partners}
              filterKey="channelPartners"
              limit={10}
              emptyMessage="No partner or supplier values are recorded against opportunities yet."
            />
          </TabsContent>
          <TabsContent value="verticals" className="mt-4">
            <RankedList groups={data.dimensions.verticals} filterKey="businessVerticals" />
          </TabsContent>
          <TabsContent value="sectors" className="mt-4">
            <RankedList groups={data.dimensions.sectors} filterKey="sectors" />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <RankedList groups={data.dimensions.products} limit={10} />
          </TabsContent>
          <TabsContent value="subproducts" className="mt-4">
            <RankedList groups={data.dimensions.subproducts} limit={12} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

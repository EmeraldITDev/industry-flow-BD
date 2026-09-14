import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { cn } from '@/lib/utils';

const toneText: Record<string, string> = {
  good: 'text-primary',
  watch: 'text-amber-600 dark:text-amber-400',
  risk: 'text-destructive',
};

export function RiskPanel({ data }: { data: ExecutiveIntelligence }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Risk & Concentration</CardTitle>
        <p className="text-xs text-muted-foreground">
          Concentration and stagnation indicators calculated from recorded pipeline data.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {data.risks.map((risk) => (
          <div key={risk.label} className="rounded-lg border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{risk.label}</span>
              <span className={cn('text-lg font-semibold tabular-nums', toneText[risk.tone])}>
                {risk.value}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{risk.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

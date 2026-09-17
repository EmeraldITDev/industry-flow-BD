import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { cn } from '@/lib/utils';

const toneText: Record<string, string> = {
  good: 'text-primary',
  watch: 'text-amber-600 dark:text-amber-400',
  risk: 'text-destructive',
};

export function RiskPanel({ data }: { data: ExecutiveIntelligence }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commercial Risk & Concentration</CardTitle>
        <p className="text-xs text-muted-foreground">
          Concentration and stagnation indicators calculated from recorded pipeline data.
          Open Stagnation risk to filter by Business Vertical or Product.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {data.risks.map((risk) => {
          const clickable = Boolean(risk.metric);
          return (
            <div
              key={risk.label}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => navigate(`/projects?metric=${encodeURIComponent(risk.metric!)}`) : undefined}
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/projects?metric=${encodeURIComponent(risk.metric!)}`);
                      }
                    }
                  : undefined
              }
              className={cn(
                'rounded-lg border border-border p-3',
                clickable && 'cursor-pointer hover:border-primary/60'
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{risk.label}</span>
                <span className={cn('text-lg font-semibold tabular-nums text-right', toneText[risk.tone])}>
                  {risk.value}
                </span>
              </div>
              {risk.label === 'Client concentration' &&
                risk.valueSharePct != null &&
                risk.recordSharePct != null && (
                  <p className="text-xs tabular-nums mt-1">
                    {risk.valueSharePct}% of value · {risk.recordSharePct}% of records
                  </p>
                )}
              <p className="text-xs text-muted-foreground mt-1">{risk.detail}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

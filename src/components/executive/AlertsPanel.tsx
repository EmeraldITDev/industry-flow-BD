import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';

const severityStyle: Record<string, string> = {
  high: 'border-l-destructive',
  medium: 'border-l-amber-500',
  info: 'border-l-primary',
};

export function AlertsPanel({ data }: { data: ExecutiveIntelligence }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Requires Executive Attention
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Exceptions derived from recorded stage, probability, value and date data.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {!data.alerts.length && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            No commercial exceptions detected in the current data.
          </div>
        )}
        {data.alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => navigate(`/projects?${alert.drillTo}`)}
            className={cn(
              'w-full text-left border-l-2 pl-3 pr-2 py-3 rounded-r-md hover:bg-muted/50 transition-colors flex items-start gap-3',
              severityStyle[alert.severity]
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {alert.category}
                </Badge>
                <span className="text-sm font-medium">{alert.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 mt-1 shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-2.5 sm:p-4 lg:p-6">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-2">{value}</p>
            {trend && (
              <p className={cn(
                "text-[10px] sm:text-sm mt-0.5 sm:mt-2 font-medium",
                trend.isPositive ? "text-chart-1" : "text-destructive"
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className="p-1.5 sm:p-3 rounded-lg bg-primary/10 shrink-0">
            <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

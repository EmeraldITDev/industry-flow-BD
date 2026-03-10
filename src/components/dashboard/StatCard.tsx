import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconSymbol?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  href?: string;
}

export function StatCard({ title, value, icon: Icon, iconSymbol, trend, className, href }: StatCardProps) {
  const content = (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      href && "cursor-pointer hover:border-primary/50 hover:shadow-md",
      className
    )}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <div className="mt-1 sm:mt-2">
              <div className="text-sm sm:text-lg lg:text-xl font-bold break-all">{value}</div>
            </div>
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

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

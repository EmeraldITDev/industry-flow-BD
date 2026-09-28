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
  /** Secondary coverage line (same style as muted description). */
  description?: string;
  /** Open a panel / run a handler instead of navigating (takes precedence over href). */
  onActivate?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconSymbol,
  trend,
  className,
  href,
  description,
  onActivate,
}: StatCardProps) {
  const clickable = !!onActivate || !!href;

  const content = (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        clickable && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
        className
      )}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <div className="mt-1 sm:mt-2">
              <div className="text-sm sm:text-lg lg:text-xl font-bold break-all">{value}</div>
            </div>
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug">
                {description}
              </p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-[10px] sm:text-sm mt-0.5 sm:mt-2 font-medium',
                  trend.isPositive ? 'text-chart-1' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className="p-1.5 sm:p-3 rounded-lg bg-primary/10 shrink-0">
            {iconSymbol ? (
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-primary">{iconSymbol}</span>
            ) : (
              <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!onActivate && href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

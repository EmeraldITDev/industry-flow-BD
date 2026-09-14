import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  sub?: string;
  movement?: string;
  tone?: 'default' | 'primary' | 'warning' | 'muted';
  drillTo?: string;
  className?: string;
}

const toneClass: Record<string, string> = {
  default: '',
  primary: 'border-primary/40 bg-primary/5',
  warning: 'border-amber-500/40 bg-amber-500/5',
  muted: 'bg-muted/40',
};

export function ExecutiveMetric({
  label,
  value,
  sub,
  movement,
  tone = 'default',
  drillTo,
  className,
}: Props) {
  const navigate = useNavigate();
  const clickable = !!drillTo;

  return (
    <Card
      onClick={clickable ? () => navigate(`/projects?${drillTo}`) : undefined}
      className={cn(
        'flex h-full min-h-[7.5rem] flex-col justify-between gap-3 p-5 sm:p-6 transition-colors',
        toneClass[tone],
        clickable && 'cursor-pointer hover:border-primary/60',
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium leading-tight">
        {label}
      </p>
      <div className="space-y-1.5">
        <p className="text-2xl sm:text-3xl font-semibold tabular-nums leading-none tracking-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground leading-snug">{sub}</p>}
        {movement && <p className="text-xs text-primary leading-snug">{movement}</p>}
      </div>
    </Card>
  );
}

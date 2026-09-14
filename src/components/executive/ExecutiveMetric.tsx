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
        'flex h-full flex-col p-4 sm:p-5 transition-colors',
        toneClass[tone],
        clickable && 'cursor-pointer hover:border-primary/60',
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium leading-tight">
        {label}
      </p>
      <p className="text-2xl lg:text-[1.75rem] font-semibold mt-2 tabular-nums leading-none">
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-2 leading-snug">{sub}</p>}
      {movement && <p className="text-xs mt-1.5 text-primary leading-snug">{movement}</p>}
    </Card>
  );
}

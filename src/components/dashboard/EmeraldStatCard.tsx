import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmeraldStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  delta?: string;
  colorScheme?: 'won' | 'pipeline' | 'commission' | 'leads' | 'rate';
  icon?: LucideIcon;
  className?: string;
}

const colorSchemes = {
  won: {
    gradient: 'from-emerald-won to-emerald-accent',
    bgAccent: 'bg-emerald-won/15',
    textAccent: 'text-emerald-won',
  },
  pipeline: {
    gradient: 'from-emerald-accent2 to-blue-400',
    bgAccent: 'bg-emerald-accent2/15',
    textAccent: 'text-emerald-accent2',
  },
  commission: {
    gradient: 'from-emerald-accent3 to-yellow-400',
    bgAccent: 'bg-emerald-accent3/15',
    textAccent: 'text-emerald-accent3',
  },
  leads: {
    gradient: 'from-emerald-accent4 to-pink-300',
    bgAccent: 'bg-emerald-accent4/15',
    textAccent: 'text-emerald-accent4',
  },
  rate: {
    gradient: 'from-emerald-initiation to-purple-300',
    bgAccent: 'bg-emerald-initiation/15',
    textAccent: 'text-emerald-initiation',
  },
};

export function EmeraldStatCard({
  label,
  value,
  subtitle,
  delta,
  colorScheme = 'won',
  icon: Icon,
  className,
}: EmeraldStatCardProps) {
  const scheme = colorSchemes[colorScheme];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card border border-border',
        'p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-accent',
        'animate-fade-up',
        className
      )}
    >
      {/* Top gradient border */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r',
          scheme.gradient
        )}
      />

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium mb-2.5">
              {label}
            </div>
            <div className={cn('text-[26px] font-extrabold leading-none font-sans', scheme.textAccent)}>
              {value}
            </div>
            {subtitle && (
              <div className="text-[11px] text-muted-foreground mt-1.5">{subtitle}</div>
            )}
          </div>

          {/* Delta badge */}
          {delta && (
            <div className={cn('text-[11px] px-2 py-0.5 rounded-xl', scheme.bgAccent, scheme.textAccent)}>
              ▲ {delta}
            </div>
          )}

          {/* Icon */}
          {Icon && (
            <div className="ml-2">
              <Icon className={cn('w-5 h-5', scheme.textAccent)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

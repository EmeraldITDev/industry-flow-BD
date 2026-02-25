import { cn } from '@/lib/utils';

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface PipelineFunnelProps {
  stages: FunnelStage[];
  title?: string;
  subtitle?: string;
  className?: string;
}

const stageColors: Record<string, string> = {
  cold: 'bg-emerald-cold',
  initiation: 'bg-emerald-initiation',
  proposal: 'bg-emerald-proposal',
  negotiation: 'bg-emerald-negotiation',
  qualification: 'bg-emerald-qualification',
  won: 'bg-emerald-won',
  lost: 'bg-emerald-lost',
};

export function PipelineFunnel({
  stages,
  title = 'Sales Pipeline Funnel',
  subtitle = 'Opportunities by stage — count & relative volume',
  className,
}: PipelineFunnelProps) {
  // Calculate max count for width percentage
  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      {/* Funnel bars */}
      <div className="flex flex-col gap-2">
        {stages.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const minWidth = stage.count > 0 ? 'min-w-[40px]' : '';

          return (
            <div key={index} className="flex items-center gap-2.5">
              {/* Label */}
              <div className="text-[12px] text-muted-foreground w-[90px] flex-shrink-0">
                {stage.label}
              </div>

              {/* Bar */}
              <div className="flex-1 bg-card border border-border/50 rounded h-7 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded flex items-center px-2.5 text-[11px] font-medium text-white/90 transition-all duration-1000 ease-out',
                    stageColors[stage.color.toLowerCase()] || 'bg-emerald-accent',
                    minWidth
                  )}
                  style={{ width: `${widthPercent}%` }}
                >
                  {stage.count > 0 && `${stage.count} ${stage.count === 1 ? 'opportunity' : 'opportunities'}`}
                </div>
              </div>

              {/* Count */}
              <div className="text-[11px] text-muted-foreground w-[30px] text-right flex-shrink-0">
                {stage.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

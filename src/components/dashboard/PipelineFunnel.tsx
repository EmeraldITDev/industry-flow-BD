import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  approval: 'bg-emerald-won',
  execution: 'bg-emerald-qualification',
  closure: 'bg-emerald-qualification',
};

const stageHexColors: Record<string, string> = {
  cold: '#3a5070',
  initiation: '#8b5cf6',
  proposal: '#0077ff',
  negotiation: '#f0a500',
  qualification: '#34d399',
  won: '#00c2a8',
  lost: '#e84393',
  approval: '#00c2a8',
  execution: '#34d399',
  closure: '#34d399',
};

export function PipelineFunnel({
  stages,
  title = 'Sales Pipeline Funnel',
  subtitle = 'Opportunities by stage — count & relative volume',
  className,
}: PipelineFunnelProps) {
  // Calculate max count for width percentage
  const maxCount = Math.max(...stages.map(s => s.count));
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

  // Prepare data for donut chart
  const donutData = stages
    .filter(s => s.count > 0)
    .map(s => ({
      name: s.label,
      value: s.count,
      color: stageHexColors[s.color.toLowerCase()] || '#3a5070',
    }));

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 sm:p-6 animate-fade-up min-w-0 overflow-hidden', className)}>
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      {/* Funnel bars */}
      <div className="flex flex-col gap-2 min-w-0">
        {stages.map((stage, index) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

          return (
            <div key={index} className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              {/* Label */}
              <div className="text-[11px] sm:text-[12px] text-muted-foreground w-16 sm:w-[90px] shrink-0 truncate">
                {stage.label}
              </div>

              {/* Bar — no fixed minWidth; that was forcing horizontal page overflow */}
              <div className="min-w-0 flex-1 bg-card border border-border/50 rounded h-8 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded flex items-center px-2 sm:px-2.5 overflow-hidden transition-all duration-1000 ease-out',
                    stageColors[stage.color.toLowerCase()] || 'bg-emerald-accent',
                  )}
                  style={{ width: `${Math.max(widthPercent, stage.count > 0 ? 8 : 0)}%` }}
                >
                  {stage.count > 0 && (
                    <span className="text-[10px] sm:text-[11px] font-medium text-white/90 whitespace-nowrap truncate">
                      {stage.count.toLocaleString()} {stage.count === 1 ? 'opp' : 'opps'}
                    </span>
                  )}
                </div>
              </div>

              {/* Count */}
              <div className="text-[11px] text-muted-foreground w-6 sm:w-[30px] text-right shrink-0 tabular-nums">
                {stage.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini donut chart */}
      {donutData.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 min-w-0">
          <div className="w-[110px] h-[110px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-2 min-w-0">
            {donutData.map((entry, index) => {
              const percentage = totalCount > 0 ? ((entry.value / totalCount) * 100).toFixed(0) : 0;
              return (
                <div key={index} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color}}
                  />
                  <span className="break-words">{entry.name} {percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PIPELINE_STAGES } from '@/types';

interface ProbabilityMixDonutProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
}

const stageColors: Record<string, string> = {
  cold: '#64748b',
  initiation: '#8b5cf6',
  qualification: '#0077ff',
  proposal: '#00c2a8',
  negotiation: '#f0a500',
  approval: '#22c55e',
  execution: '#3b82f6',
  closure: '#10b981',
  lost: '#e84393',
};

export function ProbabilityMixDonut({
  data,
  title = 'Pipeline Stage Distribution',
  subtitle = 'Projects by pipeline stage',
  className,
}: ProbabilityMixDonutProps) {
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([stage, count]) => {
      const stageInfo = PIPELINE_STAGES.find(s => s.value === stage);
      return {
        name: stageInfo?.label || stage,
        value: count,
        color: stageColors[stage] || '#3a5070',
      };
    })
    .sort((a, b) => b.value - a.value);

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
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
              formatter={(value: number) => [value, 'Projects']}
            />
            <Legend content={renderCustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

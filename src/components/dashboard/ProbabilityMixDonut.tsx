import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ProbabilityMixDonutProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
}

const probabilityColors: Record<string, string> = {
  medium: '#0077ff',
  high: '#00c2a8',
  uncertain: '#3a5070',
  low: '#e84393',
  critical: '#f0a500',
};

const probabilityLabels: Record<string, string> = {
  medium: 'Medium',
  high: 'High',
  uncertain: 'Uncertain',
  low: 'Low',
  critical: 'Critical',
};

export function ProbabilityMixDonut({
  data,
  title = 'Opportunity Probability Mix',
  subtitle = 'Confidence levels across all deals',
  className,
}: ProbabilityMixDonutProps) {
  // Transform data for recharts
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([probability, count]) => ({
      name: probabilityLabels[probability] || probability,
      value: count,
      color: probabilityColors[probability] || '#3a5070',
    }))
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
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      {/* Chart */}
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
            />
            <Legend content={renderCustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

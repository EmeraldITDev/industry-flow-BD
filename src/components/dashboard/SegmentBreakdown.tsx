import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SegmentBreakdownProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function SegmentBreakdown({
  data,
  title = 'Segment Breakdown',
  subtitle = 'Opportunity count per business unit',
  className,
}: SegmentBreakdownProps) {
  // Transform data for recharts
  const chartData = Object.entries(data)
    .map(([sector, count]) => ({
      sector,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const getBarColor = (sector: string) => {
    switch (sector) {
      case 'EMR_OGP':
        return '#0077ff';
      case 'EMR_MFG':
        return '#00c2a8';
      case 'EMR_Renewables':
        return '#8b5cf6';
      case 'EMR_Trading':
        return '#f0a500';
      case 'EMR_Services':
        return '#e84393';
      case 'EMR_Healthcare':
        return '#34d399';
      default:
        return '#3a5070';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="sector"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1000}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.sector)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

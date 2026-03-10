import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopClientsByValueProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function TopClientsByValue({
  data,
  title = 'Top Clients by PO Value (USD)',
  subtitle = 'Excluding BEDS (meter scale outlier)',
  className,
}: TopClientsByValueProps) {
  // Transform data for recharts - horizontal bar chart needs data reversed for proper ordering
  const chartData = Object.entries(data)
    .map(([client, value]) => ({
      client,
      value: value / 1000000, // Convert to millions
    }))
    .sort((a, b) => a.value - b.value); // Sort ascending for horizontal chart

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
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `$${value.toFixed(2)}M`}
            />
            <YAxis
              type="category"
              dataKey="client"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`$${value.toFixed(1)}M`, 'Value']}
            />
            <Bar
              dataKey="value"
              fill="#00c2a8"
              radius={[0, 5, 5, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

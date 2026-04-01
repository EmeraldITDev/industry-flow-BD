import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardExportOptional } from '@/context/DashboardExportContext';

interface TopClientsByValueProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
}

function formatUsdFull(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TopClientsByValue({
  data,
  title = 'Top Clients by PO Value (USD)',
  subtitle = 'Excluding BEDS (meter scale outlier)',
  className,
}: TopClientsByValueProps) {
  const dash = useDashboardExportOptional();
  const exportFull = dash?.exportFullNumbers ?? false;

  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([client, valueUsd]) => ({
        client,
        valueUsd,
        valueM: valueUsd / 1_000_000,
      }))
      .sort((a, b) => a.valueM - b.valueM);
  }, [data]);

  const dataKey = exportFull ? 'valueUsd' : 'valueM';

  const xTickFormatter = (v: number) =>
    exportFull ? formatUsdFull(v) : `$${v.toFixed(2)}M`;

  const tooltipFormatter = (value: number) =>
    exportFull
      ? [formatUsdFull(value), 'Value']
      : [`$${value.toFixed(2)}M`, 'Value'];

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: exportFull ? 48 : 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              type="number"
              dataKey={dataKey}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: exportFull ? 12 : 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              type="category"
              dataKey="client"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => tooltipFormatter(value)}
            />
            <Bar dataKey={dataKey} fill="#00c2a8" radius={[0, 5, 5, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

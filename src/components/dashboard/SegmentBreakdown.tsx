import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface SegmentBreakdownProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
  /** Map sector label → /projects?… href */
  hrefFor?: (sector: string) => string;
}

export function SegmentBreakdown({
  data,
  title = 'Segment Breakdown',
  subtitle = 'Opportunity count per business unit — click a bar to open matching projects',
  className,
  hrefFor,
}: SegmentBreakdownProps) {
  const navigate = useNavigate();
  const chartData = Object.entries(data)
    .map(([sector, count]) => ({
      sector,
      count,
      href: hrefFor?.(sector),
    }))
    .sort((a, b) => b.count - a.count);

  const getBarColor = (sector: string) => {
    switch (sector) {
      case 'EMR_Aftermarket Services': return '#0077ff';
      case 'EMR_O&M': return '#00c2a8';
      case 'EMR_Special Projects': return '#8b5cf6';
      case 'EMR_Trading': return '#f0a500';
      case 'EMR_Manufacturing': return '#e84393';
      case 'Petrochemicals': return '#0077ff';
      case 'Power': return '#00c2a8';
      case 'Oil & Gas': return '#8b5cf6';
      default: return '#3a5070';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 sm:p-6 animate-fade-up min-w-0 overflow-hidden', className)}>
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      <div className="h-[280px] min-w-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="sector"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              angle={-15}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              width={32}
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
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              animationDuration={1000}
              cursor={hrefFor ? 'pointer' : 'default'}
              onClick={(entry: { href?: string }) => {
                if (entry?.href) navigate(entry.href);
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.sector)} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

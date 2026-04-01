import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineBySalesLeadProps {
  data: Array<{ lead: string; value: number }>;
}

/** Solid hex fills so exports never rasterize as black; distinct from background in light & dark UI. */
const BAR_COLORS = [
  '#00c2a8',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ec4899',
];

export default function PipelineBySalesLead({ data }: PipelineBySalesLeadProps) {
  const sortedData = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);

  const yAxisWidth = useMemo(() => {
    const longest = sortedData.reduce((m, d) => Math.max(m, (d.lead || '').length), 8);
    return Math.min(280, Math.max(140, longest * 7 + 24));
  }, [sortedData]);

  /** Room for each horizontal bar + title block; avoids cramped/clipped labels. */
  const chartHeight = Math.min(640, Math.max(300, sortedData.length * 46 + 120));

  return (
    <div className="card p-4 overflow-visible">
      <div className="space-y-1 mb-4 pr-10">
        <h3 className="text-base font-semibold text-foreground">
          Pipeline by Sales Lead
        </h3>
        <p className="text-xs text-muted-foreground">
          Number of projects managed per lead
        </p>
      </div>

      <div className="w-full min-h-[300px] overflow-x-auto overflow-y-visible">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={sortedData}
            margin={{ top: 4, right: 16, left: 4, bottom: 8 }}
            barCategoryGap="12%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="lead"
              width={yAxisWidth}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [value, 'Projects']}
              labelFormatter={(label) => String(label)}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={36}>
              {sortedData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface ProductCategoryMixDonutProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
  hrefFor?: (product: string) => string;
}

const productColors: Record<string, string> = {
  'EQMTCE': '#0077ff',
  'Equipment': '#0077ff',
  'O&M': '#00c2a8',
  'Operations': '#00c2a8',
  'Maintenance': '#00c2a8',
  'Consumables': '#f0a500',
  'Manpower': '#8b5cf6',
  'Services': '#e84393',
};

const getProductColor = (product: string): string => {
  if (productColors[product]) return productColors[product];
  const productUpper = product.toUpperCase();
  if (productUpper.includes('EQMTCE') || productUpper.includes('EQUIPMENT')) return '#0077ff';
  if (productUpper.includes('O&M') || productUpper.includes('MAINTENANCE') || productUpper.includes('OPERATIONS')) return '#00c2a8';
  if (productUpper.includes('CONSUMABLE')) return '#f0a500';
  if (productUpper.includes('MANPOWER') || productUpper.includes('STAFF')) return '#8b5cf6';
  return '#3a5070';
};

const RADIAN = Math.PI / 180;

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) {
  if (!value || value === 0 || (percent ?? 0) < 0.035) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 1.36;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x >= cx ? 'start' : 'end';

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize={14}
      fontWeight={700}
      stroke="hsl(var(--background))"
      strokeWidth={4}
      paintOrder="stroke"
    >
      {value}
    </text>
  );
}

export function ProductCategoryMixDonut({
  data,
  title = 'Product Category Mix',
  subtitle = 'Number of opportunities per category — click a segment',
  className,
  hrefFor,
}: ProductCategoryMixDonutProps) {
  const navigate = useNavigate();
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([product, value]) => ({
      name: product,
      value,
      color: getProductColor(product),
      href: hrefFor?.(product),
    }))
    .sort((a, b) => b.value - a.value);

  const go = (href?: string) => {
    if (href) navigate(href);
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-3">{subtitle}</div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              style={{ cursor: hrefFor ? 'pointer' : 'default' }}
              onClick={(_, idx) => go(chartData[idx]?.href)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} className="outline-none cursor-pointer" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              formatter={(value: number) => [value, 'Opportunities']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 space-y-1">
        {chartData.map((entry, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!entry.href}
            onClick={() => go(entry.href)}
            className={cn(
              'flex w-full items-center justify-between text-[11px] rounded-md px-1 py-0.5 -mx-1',
              entry.href && 'hover:bg-accent/50 cursor-pointer transition-colors'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground truncate">{entry.name}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">{entry.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

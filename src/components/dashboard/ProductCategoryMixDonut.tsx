import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ProductCategoryMixDonutProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
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
  // Check for exact matches
  if (productColors[product]) return productColors[product];
  
  // Check for partial matches
  const productUpper = product.toUpperCase();
  if (productUpper.includes('EQMTCE') || productUpper.includes('EQUIPMENT')) return '#0077ff';
  if (productUpper.includes('O&M') || productUpper.includes('MAINTENANCE') || productUpper.includes('OPERATIONS')) return '#00c2a8';
  if (productUpper.includes('CONSUMABLE')) return '#f0a500';
  if (productUpper.includes('MANPOWER') || productUpper.includes('STAFF')) return '#8b5cf6';
  
  return '#3a5070'; // Default color
};

export function ProductCategoryMixDonut({
  data,
  title = 'Product Category Mix',
  subtitle = 'Number of opportunities per category',
  className,
}: ProductCategoryMixDonutProps) {
  // Transform data for recharts - now showing opportunity count
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([product, value]) => ({
      name: product,
      value,
      color: getProductColor(product),
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
              formatter={(value: number) => [value, 'Opportunities']}
            />
            <Legend content={renderCustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

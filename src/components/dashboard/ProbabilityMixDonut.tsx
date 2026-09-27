import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PIPELINE_STAGES } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ProbabilityMixDonutProps {
  data: Record<string, number>;
  title?: string;
  subtitle?: string;
  className?: string;
  /** Map pipeline stage value → /projects?… href (same keys as Sales Pipeline Funnel). */
  hrefFor?: (stage: string) => string;
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

export function ProbabilityMixDonut({
  data,
  title = 'Pipeline Stage Distribution',
  subtitle = 'Projects by pipeline stage — click a segment or legend row',
  className,
  hrefFor,
}: ProbabilityMixDonutProps) {
  const navigate = useNavigate();
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([stage, count]) => {
      const stageInfo = PIPELINE_STAGES.find((s) => s.value === stage);
      return {
        name: stageInfo?.label || stage,
        stage,
        value: count,
        color: stageColors[stage] || '#3a5070',
        href: hrefFor?.(stage),
      };
    })
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

      <div className="h-[200px]">
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
              formatter={(value: number) => [value, 'Projects']}
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

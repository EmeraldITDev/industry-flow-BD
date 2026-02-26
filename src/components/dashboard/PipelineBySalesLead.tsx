import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineBySalesLeadProps {
  data: Array<{ lead: string; value: number }>;
}

export default function PipelineBySalesLead({ data }: PipelineBySalesLeadProps) {
  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Format value in millions
  const formatValue = (value: number) => {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  };

  // Color mapping for leads
  const getColor = (index: number) => {
    const colors = [
      'hsl(var(--emerald-won))',      // Orange for top
      'hsl(var(--emerald-accent))',   // Blue for second
      'hsl(var(--emerald-initiation))', // Teal for third
      'hsl(var(--emerald-proposal))',  // Purple for fourth
      'hsl(var(--emerald-negotiation))', // Pink for fifth
      'hsl(var(--emerald-qualification))', // Others
    ];
    return colors[index] || colors[colors.length - 1];
  };

  return (
    <div className="card p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">
          Pipeline by Sales Lead (Active Deals)
        </h3>
        <p className="text-xs text-muted-foreground">
          Proposal + Negotiation + Qualification stage only
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="lead" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickFormatter={(value: any) => `$${(value / 1_000_000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [formatValue(value), 'Pipeline Value']}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

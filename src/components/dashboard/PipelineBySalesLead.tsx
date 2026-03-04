import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineBySalesLeadProps {
  data: Array<{ lead: string; value: number }>;
}

export default function PipelineBySalesLead({ data }: PipelineBySalesLeadProps) {
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  const getColor = (index: number) => {
    const colors = [
      'hsl(var(--emerald-won))',
      'hsl(var(--emerald-accent))',
      'hsl(var(--emerald-initiation))',
      'hsl(var(--emerald-proposal))',
      'hsl(var(--emerald-negotiation))',
      'hsl(var(--emerald-qualification))',
    ];
    return colors[index] || colors[colors.length - 1];
  };

  return (
    <div className="card p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">
          Pipeline by Sales Lead
        </h3>
        <p className="text-xs text-muted-foreground">
          Number of projects managed per lead
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
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [value, 'Projects']}
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

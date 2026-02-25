import { useMemo, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Project } from '@/types';
import { useCurrency } from '@/context/CurrencyContext';

interface RevenueBySectorChartProps {
  projects: Project[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

export function RevenueBySectorChart({ projects }: RevenueBySectorChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { getContractValue, formatCurrency } = useCurrency();

  const data = useMemo(() => {
    const sectorRevenue: Record<string, number> = {};
    projects.forEach((p) => {
      const sector = p.sector || 'Other';
      sectorRevenue[sector] = (sectorRevenue[sector] || 0) + getContractValue(p);
    });
    return Object.entries(sectorRevenue)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects, getContractValue]);

  const handleExport = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = 'white';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'revenue-by-sector-chart.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base">Revenue by Sector</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export chart">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0" ref={chartRef}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
            />
            <Legend
              verticalAlign="bottom"
              formatter={(value: string) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 11 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

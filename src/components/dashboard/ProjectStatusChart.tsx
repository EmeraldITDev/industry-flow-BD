import { useMemo, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Project } from '@/types';

interface ProjectStatusChartProps {
  projects: Project[];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--chart-1))',
  'on-hold': 'hsl(var(--chart-5))',
  completed: 'hsl(var(--chart-2))',
};

export function ProjectStatusChart({ projects }: ProjectStatusChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
      value,
      key: name,
    }));
  }, [projects]);

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
      a.download = 'project-status-chart.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  if (projects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base">Project Status</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export chart">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0" ref={chartRef}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || 'hsl(var(--muted))'} />
              ))}
            </Pie>
            <Tooltip
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

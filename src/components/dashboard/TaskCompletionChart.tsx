import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, ListChecks } from 'lucide-react';
import { Project } from '@/types';

interface TaskCompletionChartProps {
  projects: Project[];
}

export function TaskCompletionChart({ projects }: TaskCompletionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const statusCounts = { todo: 0, 'in-progress': 0, review: 0, completed: 0 };
    projects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        if (t.status in statusCounts) {
          statusCounts[t.status as keyof typeof statusCounts] += 1;
        }
      });
    });
    return [
      { name: 'To Do', count: statusCounts.todo, fill: 'hsl(var(--chart-5))' },
      { name: 'In Progress', count: statusCounts['in-progress'], fill: 'hsl(var(--chart-3))' },
      { name: 'Review', count: statusCounts.review, fill: 'hsl(var(--chart-4))' },
      { name: 'Completed', count: statusCounts.completed, fill: 'hsl(var(--chart-1))' },
    ];
  }, [projects]);

  const total = data.reduce((s, d) => s + d.count, 0);

  const handleExport = () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'task-completion.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (total === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          Task Completion
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0" ref={chartRef}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

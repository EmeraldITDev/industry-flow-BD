import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Item {
  label: string;
  scrollTo?: string;
  navigateTo?: string;
}

const ITEMS: Item[] = [
  { label: 'Where are we commercially right now?', scrollTo: 'exec-overview' },
  { label: 'How many deals have we won this year?', scrollTo: 'exec-conversion' },
  { label: 'Which deals are closest to winning?', scrollTo: 'exec-near' },
  { label: 'Where are we on Dangote and other key accounts?', scrollTo: 'exec-accounts' },
  { label: 'Which clients and partners drive the pipeline?', scrollTo: 'exec-drivers' },
  { label: 'What has changed recently?', scrollTo: 'exec-movement' },
  {
    label: 'Show every won or executing opportunity',
    navigateTo: '/projects?metric=won',
  },
];

export function QuickQuestions() {
  const navigate = useNavigate();

  const handle = (item: Item) => {
    if (item.navigateTo) return navigate(item.navigateTo);
    if (item.scrollTo)
      document.getElementById(item.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Executive Questions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handle(item)}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/60 hover:text-primary transition-colors"
          >
            {item.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

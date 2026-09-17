import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RelationshipStage } from '@/types/partners';

const STAGE_STYLES: Record<string, string> = {
  Identified: 'bg-muted text-muted-foreground border-border',
  Prospecting: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  'Discovery Discussions': 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  'NDA Signed': 'bg-chart-1/20 text-chart-1 border-chart-1/30',
  'Detailed Discussions': 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  'Agreement Drafted | Negotiation': 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  'Due Diligence | Compliance Review | Approval':
    'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  Onboarding: 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400',
  'Active Partner': 'bg-primary/15 text-primary border-primary/25',
  Dormant: 'bg-muted text-muted-foreground border-border',
  Disqualified: 'bg-destructive/15 text-destructive border-destructive/30',
  'Terminated | Offboarded': 'bg-destructive/15 text-destructive border-destructive/30',
  'Blacklisted | Delisted': 'bg-destructive/20 text-destructive border-destructive/40',
};

export function relationshipStageClass(stage: string): string {
  return STAGE_STYLES[stage] ?? 'bg-muted text-muted-foreground border-border';
}

export function RelationshipStageBadge({
  stage,
  className,
}: {
  stage: RelationshipStage | string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', relationshipStageClass(stage), className)}
    >
      {stage}
    </Badge>
  );
}

export function KycStatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? '').toLowerCase();
  const verified = normalized === 'verified' || normalized === 'approved';
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        verified
          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400'
      )}
    >
      {status || 'Unverified'}
    </Badge>
  );
}

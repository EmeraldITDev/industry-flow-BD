import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExecutiveIntelligence } from '@/lib/executive/analytics';
import { fmtNgn, fmtPercent, fmtUsd } from '@/lib/executive/format';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PipelineHealthExportButton } from './PipelineHealthExport';

const toneStyles = {
  good: { border: 'border-primary/40', bg: 'bg-primary/5', icon: CheckCircle2, text: 'text-primary' },
  watch: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: Activity,
    text: 'text-amber-600 dark:text-amber-400',
  },
  risk: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/5',
    icon: AlertTriangle,
    text: 'text-destructive',
  },
} as const;

export function PipelineHealthSection({
  data,
  onOpenStagnant,
}: {
  data: ExecutiveIntelligence;
  /** Opens the shared snapshot sheet for stagnant opportunities. */
  onOpenStagnant?: () => void;
}) {
  const navigate = useNavigate();
  const tone = toneStyles[data.health.tone];
  const Icon = tone.icon;
  const stagnantCount = data.totals.stagnant ?? 0;
  const isStagnationAlert =
    stagnantCount > 0 &&
    (data.health.verdict.toLowerCase().includes('stagnation') ||
      data.health.narrative.toLowerCase().includes('no pipeline-stage change'));
  const healthClickable = Boolean(onOpenStagnant) && isStagnationAlert;

  return (
    <section className="space-y-4">
      <Card
        role={healthClickable ? 'button' : undefined}
        tabIndex={healthClickable ? 0 : undefined}
        onClick={healthClickable ? onOpenStagnant : undefined}
        onKeyDown={
          healthClickable
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenStagnant?.();
                }
              }
            : undefined
        }
        className={cn(
          tone.border,
          tone.bg,
          healthClickable && 'cursor-pointer transition-colors hover:border-destructive/70'
        )}
      >
        <CardContent className="p-5 flex gap-4">
          <Icon className={cn('w-6 h-6 shrink-0 mt-0.5', tone.text)} />
          <div className="min-w-0 flex-1">
            <h3 className={cn('font-semibold', tone.text)}>{data.health.verdict}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{data.health.narrative}</p>
            {healthClickable && (
              <p className={cn('text-xs font-medium mt-2', tone.text)}>
                View {stagnantCount} stagnant opportunities →
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Executive Pipeline Health</CardTitle>
            <p className="text-xs text-muted-foreground">
              Initiation → Qualification → Proposal → Negotiation → Execution. "New this period"
              uses each opportunity's Start Date (Intake Date if Start Date is blank). Currency
              values are kept separate and never aggregated across USD and NGN.
            </p>
          </div>
          <PipelineHealthExportButton data={data} />
        </CardHeader>
        <CardContent className="space-y-4">
          {data.stages.map((stage) => (
            <button
              key={stage.stage}
              type="button"
              onClick={() =>
                navigate(`/projects?metric=${encodeURIComponent(stage.metric ?? `stage:${stage.stage}`)}`)
              }
              className="w-full text-left rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{stage.label}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {stage.count} · {fmtPercent(stage.share)} of active
                  </span>
                </div>
                <div className="text-sm tabular-nums flex gap-3">
                  <span className="font-semibold">{fmtUsd(stage.usd)}</span>
                  <span className="text-muted-foreground">{fmtNgn(stage.ngn)}</span>
                </div>
              </div>
              <Progress value={Math.min(100, stage.share * 100)} className="h-1.5 mt-2" />
              <div className="flex flex-wrap justify-between gap-2 mt-2">
                <p className="text-xs text-muted-foreground">{stage.interpretation}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                  Avg probability {fmtPercent(stage.avgProbability)}
                  {stage.newInPeriod ? ` · ${stage.newInPeriod} new this period` : ''}
                </p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TeamMember {
  lead: string;
  totalDeals: number;
  won: number;
  active: number;
  loadPercentage: number;
  projectsHref?: string;
  wonHref?: string;
  activeHref?: string;
}

interface TeamOpportunityLoadProps {
  data: TeamMember[];
}

export default function TeamOpportunityLoad({ data }: TeamOpportunityLoadProps) {
  const sortedData = [...data].sort((a, b) => b.totalDeals - a.totalDeals);
  const maxDeals = Math.max(...sortedData.map((d) => d.totalDeals), 1);

  return (
    <div className="card p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">
          Team Opportunity Load
        </h3>
        <p className="text-xs text-muted-foreground">
          Total projects managed per sales lead — click Projects / Won / Active counts
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[120px,60px,1fr,60px,60px] gap-3 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground pb-2 border-b border-border">
          <div>Lead</div>
          <div className="text-right">Projects</div>
          <div>Load</div>
          <div className="text-center">Won</div>
          <div className="text-center">Active</div>
        </div>

        {sortedData.map((member) => {
          const barWidth = (member.totalDeals / maxDeals) * 100;

          return (
            <div
              key={member.lead}
              className="grid grid-cols-[120px,60px,1fr,60px,60px] gap-3 items-center text-sm"
            >
              <div className="font-medium text-card-foreground truncate">
                {member.lead}
              </div>

              <div className="text-right font-mono">
                {member.projectsHref ? (
                  <Link
                    to={member.projectsHref}
                    className="text-primary underline-offset-2 hover:underline tabular-nums"
                  >
                    {member.totalDeals}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{member.totalDeals}</span>
                )}
              </div>

              <div className="relative h-6 bg-muted/30 rounded-sm overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-accent/80 to-emerald-accent rounded-sm transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="flex justify-center">
                {member.wonHref ? (
                  <Link
                    to={member.wonHref}
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full',
                      'bg-emerald-won/20 text-emerald-won text-xs font-semibold',
                      'hover:ring-2 hover:ring-emerald-won/40 transition-shadow'
                    )}
                  >
                    {member.won}
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-won/20 text-emerald-won text-xs font-semibold">
                    {member.won}
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                {member.activeHref ? (
                  <Link
                    to={member.activeHref}
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full',
                      'bg-emerald-accent/20 text-emerald-accent text-xs font-semibold',
                      'hover:ring-2 hover:ring-emerald-accent/40 transition-shadow'
                    )}
                  >
                    {member.active}
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-accent/20 text-emerald-accent text-xs font-semibold">
                    {member.active}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

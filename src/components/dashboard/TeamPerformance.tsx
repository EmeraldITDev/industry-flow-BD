import { cn } from '@/lib/utils';

interface TeamMember {
  name: string;
  deals: number;
  won: number;
  active: number;
}

interface TeamPerformanceProps {
  members: TeamMember[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function TeamPerformance({
  members,
  title = 'Team Opportunity Load',
  subtitle = 'Total deals managed per sales lead',
  className,
}: TeamPerformanceProps) {
  // Calculate max deals for progress bars
  const maxDeals = Math.max(...members.map(m => m.deals));

  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 animate-fade-up', className)}>
      {/* Title */}
      <div className="mb-1">
        <h3 className="text-[13px] font-bold font-sans">{title}</h3>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{subtitle}</div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2.5">
                Lead
              </th>
              <th className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2.5">
                Deals
              </th>
              <th className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2.5 w-[100px]">
                Load
              </th>
              <th className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2.5">
                Won
              </th>
              <th className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2.5">
                Active
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => {
              const loadPercent = (member.deals / maxDeals) * 100;

              return (
                <tr
                  key={index}
                  className="border-b border-border/50 hover:bg-muted/5 transition-colors"
                >
                  <td className="py-2.5 text-[12px] font-medium">{member.name}</td>
                  <td className="py-2.5 text-[12px]">{member.deals}</td>
                  <td className="py-2.5">
                    <div className="w-[100px]">
                      <div className="h-1 bg-card border border-border/50 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-accent to-emerald-accent2 rounded transition-all duration-300"
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-xl text-[10px] font-semibold bg-emerald-won/15 text-emerald-won">
                      {member.won}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-xl text-[10px] font-semibold bg-emerald-accent2/15 text-emerald-accent2">
                      {member.active}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

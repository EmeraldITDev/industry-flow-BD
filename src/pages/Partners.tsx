import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Handshake, AlertTriangle, Plus, Search, Loader2 } from 'lucide-react';
import { partnersService } from '@/services/partners';
import { businessVerticals, sectorColors } from '@/data/mockData';
import { RELATIONSHIP_STAGES } from '@/types/partners';
import type { Sector } from '@/types';
import { RelationshipStageBadge } from '@/components/partners/RelationshipStageBadge';
import { PartnerFormSheet } from '@/components/partners/PartnerFormSheet';
import { safeFormatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const ALL = 'all';

export default function Partners() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState(ALL);
  const [stageFilter, setStageFilter] = useState(ALL);
  const [addOpen, setAddOpen] = useState(false);

  const { data: partners = [], isLoading, isError } = useQuery({
    queryKey: ['partners', search, verticalFilter, stageFilter],
    queryFn: () =>
      partnersService.getAll({
        search: search.trim() || undefined,
        vertical: verticalFilter !== ALL ? verticalFilter : undefined,
        relationshipStage: stageFilter !== ALL ? stageFilter : undefined,
      }),
    staleTime: 30 * 1000,
  });

  const filtered = useMemo(() => {
    // Client-side refine in case backend ignores filters
    return partners.filter((p) => {
      if (verticalFilter !== ALL && !p.verticals.includes(verticalFilter)) {
        return false;
      }
      if (
        stageFilter !== ALL &&
        p.relationshipStage !== stageFilter
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          p.companyName,
          p.contactPerson,
          p.email,
          p.nextAction,
          ...p.verticals,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [partners, verticalFilter, stageFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Partner Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage partner relationships, owners, and SCM vendor links.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="pl-9"
          />
        </div>
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="All verticals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All verticals</SelectItem>
            {businessVerticals.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {RELATIONSHIP_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading partners…
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Unable to load partners. Please try again.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No partners match your filters.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {filtered.map((partner) => {
          const multiOwner = partner.bdOwnerIds.length > 1;
          return (
            <Card
              key={partner.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => navigate(`/partners/${partner.id}`)}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold truncate">
                        {partner.companyName}
                      </h2>
                      <RelationshipStageBadge
                        stage={partner.relationshipStage}
                      />
                      {multiOwner && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                          title="Multiple BD owners assigned"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Multiple owners
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {partner.contactPerson
                        ? `Contact: ${partner.contactPerson}`
                        : 'No contact person'}
                    </p>
                    {partner.verticals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {partner.verticals.map((v) => (
                          <Badge
                            key={v}
                            variant="outline"
                            className={cn(
                              'text-xs',
                              sectorColors[v as Sector] ??
                                'bg-muted text-muted-foreground'
                            )}
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 space-y-1 text-sm sm:text-right">
                    <p className="text-muted-foreground">
                      Last contact:{' '}
                      <span className="text-foreground">
                        {safeFormatDate(partner.lastContactDate, 'MMM d, yyyy', '—')}
                      </span>
                    </p>
                    <p className="text-muted-foreground max-w-xs sm:ml-auto">
                      Next:{' '}
                      <span className="text-foreground">
                        {partner.nextAction?.trim() || '—'}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PartnerFormSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

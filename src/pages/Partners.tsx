import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { teamService } from '@/services/team';
import { businessVerticals, sectorColors } from '@/data/mockData';
import { PRODUCT_OPTIONS } from '@/data/productCatalog';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState(ALL);
  const [stageFilter, setStageFilter] = useState(ALL);
  const [productFilter, setProductFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: partners = [], isLoading, isError } = useQuery({
    queryKey: [
      'partners',
      debouncedSearch,
      verticalFilter,
      stageFilter,
      productFilter,
      ownerFilter,
    ],
    queryFn: () =>
      partnersService.getAll({
        search: debouncedSearch || undefined,
        vertical: verticalFilter !== ALL ? verticalFilter : undefined,
        relationshipStage: stageFilter !== ALL ? stageFilter : undefined,
        product: productFilter !== ALL ? productFilter : undefined,
        relationshipOwnerId: ownerFilter !== ALL ? ownerFilter : undefined,
      }),
    staleTime: 30 * 1000,
  });

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (verticalFilter !== ALL && !p.verticals.includes(verticalFilter)) {
        return false;
      }
      if (stageFilter !== ALL && p.relationshipStage !== stageFilter) {
        return false;
      }
      if (
        productFilter !== ALL &&
        !p.productCategories.includes(productFilter)
      ) {
        return false;
      }
      if (
        ownerFilter !== ALL &&
        !p.relationshipOwnerIds.includes(ownerFilter)
      ) {
        return false;
      }
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const ownerNames =
          p.relationshipOwners?.map((o) => o.name).filter(Boolean) ?? [];
        const hay = [
          p.companyName,
          p.contactPerson,
          p.email,
          p.nextAction,
          ...p.verticals,
          ...p.productCategories,
          ...ownerNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    partners,
    verticalFilter,
    stageFilter,
    productFilter,
    ownerFilter,
    debouncedSearch,
  ]);

  const ownerOptions = useMemo(
    () =>
      [...teamMembers]
        .map((m: any) => ({
          id: String(m.id),
          name: String(m.name || m.email || m.id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [teamMembers]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
            <Handshake className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Partner Tracker
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage partner relationships, owners, and SCM vendor links.
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0 self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4 p-4 sm:p-6">
          <div>
            <CardTitle className="text-base sm:text-lg">Partners</CardTitle>
            <CardDescription>
              Filter by relationship owner, stage, vertical, or product
            </CardDescription>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_repeat(4,minmax(11rem,14rem))] gap-3">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search partners..."
                className="pl-9"
              />
            </div>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All relationship owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All relationship owners</SelectItem>
                {ownerOptions.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
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
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger>
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
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All products</SelectItem>
                {PRODUCT_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading partners…
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              Unable to load partners. Please try again.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No partners match your filters.
            </div>
          )}

          {!isLoading &&
            !isError &&
            filtered.map((partner) => {
              const multiOwner = partner.relationshipOwnerIds.length > 1;
              const ownerLabel =
                partner.relationshipOwners
                  ?.map((o) => o.name)
                  .filter(Boolean)
                  .join(', ') ||
                (partner.relationshipOwnerIds.length
                  ? `${partner.relationshipOwnerIds.length} owner${
                      partner.relationshipOwnerIds.length === 1 ? '' : 's'
                    }`
                  : null);

              return (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => navigate(`/partners/${partner.id}`)}
                  className="w-full rounded-xl border bg-card text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold truncate">
                          {partner.companyName}
                        </h2>
                        <RelationshipStageBadge
                          stage={partner.relationshipStage}
                        />
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            partner.isScmLinked || partner.scmVendorId
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          )}
                        >
                          {partner.isScmLinked || partner.scmVendorId
                            ? 'Linked to SCM Vendor'
                            : 'Not Linked'}
                        </Badge>
                        {multiOwner && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                            title="Multiple relationship owners assigned"
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
                        {ownerLabel ? ` · Owners: ${ownerLabel}` : ''}
                      </p>
                      {(partner.verticals.length > 0 ||
                        partner.productCategories.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {partner.verticals.map((v) => (
                            <Badge
                              key={`v-${v}`}
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
                          {partner.productCategories.map((p) => (
                            <Badge
                              key={`p-${p}`}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 space-y-1.5 text-sm sm:text-right sm:pl-6">
                      <p className="text-muted-foreground">
                        Last contact:{' '}
                        <span className="text-foreground">
                          {safeFormatDate(
                            partner.lastContactDate,
                            'MMM d, yyyy',
                            '—'
                          )}
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
                </button>
              );
            })}
        </CardContent>
      </Card>

      <PartnerFormSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

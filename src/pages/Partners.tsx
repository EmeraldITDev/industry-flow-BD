import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Handshake,
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  Download,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { partnersService } from '@/services/partners';
import { teamService } from '@/services/team';
import { businessVerticals, sectorColors } from '@/data/mockData';
import { PRODUCT_OPTIONS } from '@/data/productCatalog';
import { RELATIONSHIP_STAGES, isPartnerProfileComplete } from '@/types/partners';
import type { Partner } from '@/types/partners';
import type { Sector } from '@/types';
import { RelationshipStageBadge } from '@/components/partners/RelationshipStageBadge';
import { PartnerFormSheet } from '@/components/partners/PartnerFormSheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALL = 'all';
const PER_PAGE = 50;

function exportPartnersCsv(partners: Partner[]) {
  const headers = [
    'Company',
    'Contact',
    'Email',
    'Stage',
    'Verticals',
    'Products',
    'SCM Linked',
    'Linked Opportunities',
    'Total Value NGN',
    'Total Value USD',
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = partners.map((p) =>
    [
      p.companyName,
      p.contactPerson ?? '',
      p.email ?? '',
      p.relationshipStage,
      (p.verticals ?? []).join('; '),
      (p.productCategories ?? []).join('; '),
      p.isScmLinked || p.scmVendorId ? 'Yes' : 'No',
      String(p.linkedOpportunitiesCount ?? 0),
      String(p.totalValueNgn ?? 0),
      String(p.totalValueUsd ?? 0),
    ]
      .map(escape)
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `partners-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Partner report downloaded');
}

export default function Partners() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState(ALL);
  const [stageFilter, setStageFilter] = useState(() => {
    const stage = searchParams.get('relationshipStage') || searchParams.get('stage');
    return stage && stage.trim() ? stage : ALL;
  });
  const [productFilter, setProductFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(() => {
    const owner = searchParams.get('ownerId') || searchParams.get('relationshipOwnerId');
    return owner && owner.trim() ? owner : ALL;
  });
  const [incompleteOnly, setIncompleteOnly] = useState(
    () => searchParams.get('incomplete') === '1' || searchParams.get('incomplete') === 'true'
  );
  const [zeroLinksOnly, setZeroLinksOnly] = useState(
    () => searchParams.get('zeroLinks') === '1' || searchParams.get('zero_links') === '1'
  );
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, verticalFilter, stageFilter, productFilter, ownerFilter, incompleteOnly, zeroLinksOnly]);

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      vertical: verticalFilter !== ALL ? verticalFilter : undefined,
      relationshipStage: stageFilter !== ALL ? stageFilter : undefined,
      product: productFilter !== ALL ? productFilter : undefined,
      relationshipOwnerId: ownerFilter !== ALL ? ownerFilter : undefined,
      incomplete: incompleteOnly || undefined,
      zeroLinks: zeroLinksOnly || undefined,
      per_page: PER_PAGE,
      page,
    }),
    [
      debouncedSearch,
      verticalFilter,
      stageFilter,
      productFilter,
      ownerFilter,
      incompleteOnly,
      zeroLinksOnly,
      page,
    ]
  );

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: listData, isLoading, isError, isFetching } = useQuery({
    queryKey: ['partners-list', listFilters],
    queryFn: () => partnersService.list(listFilters),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  const partners = listData?.partners ?? [];
  const totalCount = listData?.total ?? 0;
  const lastPage = Math.max(1, listData?.lastPage ?? 1);
  const currentPage = listData?.page ?? page;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partnersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners-list'] });
      toast.success('Partner deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete partner'),
  });

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

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const window = 5;
    let start = Math.max(1, currentPage - Math.floor(window / 2));
    let end = Math.min(lastPage, start + window - 1);
    start = Math.max(1, end - window + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [currentPage, lastPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === partners.length
        ? new Set()
        : new Set(partners.map((p) => p.id))
    );
  }, [partners]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setIsDeleting(true);
    let success = 0;
    let failed = 0;
    const BATCH = 10;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((id) => partnersService.delete(id))
      );
      results.forEach((r) =>
        r.status === 'fulfilled' ? success++ : failed++
      );
    }
    queryClient.invalidateQueries({ queryKey: ['partners'] });
    queryClient.invalidateQueries({ queryKey: ['partners-list'] });
    setIsDeleting(false);
    exitSelectMode();
    if (failed === 0) {
      toast.success(`${success} partner(s) deleted successfully`);
    } else {
      toast.warning(`${success} deleted, ${failed} failed`);
    }
  };

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
              {isLoading
                ? 'Loading…'
                : `${totalCount} partner${totalCount === 1 ? '' : 's'} found`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => exportPartnersCsv(partners)}
            disabled={partners.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export report
          </Button>
          {!selectMode ? (
            <Button variant="outline" onClick={() => setSelectMode(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Select
            </Button>
          ) : (
            <Button variant="outline" onClick={exitSelectMode}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
        </div>
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          <Checkbox
            checked={
              partners.length > 0 && selectedIds.size === partners.length
            }
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {partners.length} selected on this page
          </span>
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0 || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} partner
                  {selectedIds.size === 1 ? '' : 's'}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Selected partners will be permanently
                  removed and unlinked from any opportunities.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

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
                <SelectItem value="unassigned">Unassigned</SelectItem>
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
          {(incompleteOnly || zeroLinksOnly) && (
            <div className="flex flex-wrap items-center gap-2">
              {incompleteOnly && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 cursor-pointer"
                  onClick={() => setIncompleteOnly(false)}
                >
                  Incomplete profiles
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {zeroLinksOnly && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/40 bg-primary/10 text-primary cursor-pointer"
                  onClick={() => setZeroLinksOnly(false)}
                >
                  Zero linked opportunities
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
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

          {!isLoading && !isError && partners.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No partners match your filters.
            </div>
          )}

          {!isLoading &&
            !isError &&
            partners.map((partner) => {
              const multiOwner = partner.relationshipOwnerIds.length > 1;
              const profileIncomplete = !isPartnerProfileComplete(partner);
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
              const selected = selectedIds.has(partner.id);

              return (
                <div
                  key={partner.id}
                  className={cn(
                    'w-full rounded-xl border bg-card text-left transition-colors hover:bg-muted/40',
                    selectMode && selected && 'ring-2 ring-primary/40'
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3 flex-1">
                      {selectMode && (
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelect(partner.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <button
                        type="button"
                        className="min-w-0 flex-1 space-y-2.5 text-left focus-visible:outline-none"
                        onClick={() => {
                          if (selectMode) {
                            toggleSelect(partner.id);
                            return;
                          }
                          // Open the linked-opportunities list (same as the count control).
                          navigate(`/projects?partner_id=${partner.id}`);
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold truncate">
                            {partner.companyName}
                          </h2>
                          {profileIncomplete && (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                              title="Contact person or email is missing"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Incomplete Information
                            </Badge>
                          )}
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
                      </button>
                    </div>
                    <div className="shrink-0 flex flex-col gap-3 sm:items-end sm:pl-6">
                      <div className="space-y-1.5 text-sm sm:text-right">
                        <p className="text-muted-foreground">
                          Linked opportunities:{' '}
                          <button
                            type="button"
                            className="text-foreground font-medium tabular-nums text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects?partner_id=${partner.id}`);
                            }}
                          >
                            {partner.linkedOpportunitiesCount ?? 0}
                          </button>
                        </p>
                        <p className="text-muted-foreground">
                          Volume:{' '}
                          <span className="text-foreground tabular-nums">
                            {(partner.totalValueUsd ?? 0) > 0
                              ? `$${(partner.totalValueUsd ?? 0).toLocaleString()}`
                              : '—'}
                            {(partner.totalValueNgn ?? 0) > 0
                              ? ` · ₦${(partner.totalValueNgn ?? 0).toLocaleString()}`
                              : ''}
                          </span>
                        </p>
                      </div>
                      {!selectMode && (
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/${partner.id}`);
                            }}
                          >
                            View profile
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(partner);
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {lastPage > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {lastPage}
                {totalCount > 0
                  ? ` · showing ${partners.length} of ${totalCount}`
                  : ''}
                {isFetching ? ' · updating…' : ''}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {pageNumbers[0] > 1 && (
                  <>
                    <Button
                      type="button"
                      variant={currentPage === 1 ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setPage(1)}
                    >
                      1
                    </Button>
                    {pageNumbers[0] > 2 && (
                      <span className="px-1 text-muted-foreground">…</span>
                    )}
                  </>
                )}
                {pageNumbers.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-9"
                    disabled={isFetching}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < lastPage && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < lastPage - 1 && (
                      <span className="px-1 text-muted-foreground">…</span>
                    )}
                    <Button
                      type="button"
                      variant={currentPage === lastPage ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setPage(lastPage)}
                    >
                      {lastPage}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage || isFetching}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PartnerFormSheet open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.companyName}
              </span>{' '}
              from the Partner Tracker and unlink it from any opportunities. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete partner'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

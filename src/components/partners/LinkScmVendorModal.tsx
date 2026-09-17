import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { partnersService } from '@/services/partners';
import { KycStatusBadge } from '@/components/partners/RelationshipStageBadge';
import type { ScmVendorSearchResult } from '@/types/partners';
import { toast } from 'sonner';

const DEFAULT_LIST_LIMIT = 50;

interface LinkScmVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName?: string;
}

export function LinkScmVendorModal({
  open,
  onOpenChange,
  partnerId,
  partnerName,
}: LinkScmVendorModalProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<ScmVendorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setSearching(false);
      return;
    }
    // Reset so the empty-q default list loads as soon as the modal opens.
    setQuery('');
    setDebouncedQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setSearching(true);
    partnersService
      .searchScmVendors(debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          toast.error('Unable to search SCM vendors');
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const isDefaultList = debouncedQuery.length === 0;

  const { displayResults, showingTruncatedDefault } = useMemo(() => {
    if (!isDefaultList) {
      return { displayResults: results, showingTruncatedDefault: false };
    }

    const sorted = [...results].sort((a, b) =>
      a.vendorName.localeCompare(b.vendorName, undefined, { sensitivity: 'base' })
    );
    const truncated = sorted.length > DEFAULT_LIST_LIMIT;
    return {
      displayResults: truncated ? sorted.slice(0, DEFAULT_LIST_LIMIT) : sorted,
      showingTruncatedDefault: truncated,
    };
  }, [results, isDefaultList]);

  const linkMutation = useMutation({
    mutationFn: (vendorId: string) =>
      partnersService.update(partnerId, { scmVendorId: vendorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['project-partners'] });
      toast.success('SCM vendor linked');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to link SCM vendor'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to SCM Vendor</DialogTitle>
          <DialogDescription>
            Search SCM vendors
            {partnerName ? ` for ${partnerName}` : ''} and select one to link.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by vendor name or ID..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {searching && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isDefaultList ? 'Loading vendors…' : 'Searching…'}
            </div>
          )}
          {!searching && displayResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vendors found.
            </p>
          )}
          {!searching &&
            displayResults.map((vendor) => (
              <button
                key={vendor.vendorId}
                type="button"
                disabled={linkMutation.isPending}
                onClick={() => linkMutation.mutate(vendor.vendorId)}
                className="flex w-full items-center justify-between gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/60 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {vendor.vendorName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {vendor.vendorId}
                  </p>
                </div>
                <KycStatusBadge status={vendor.kycStatus} />
              </button>
            ))}
        </div>

        {!searching && showingTruncatedDefault && (
          <p className="text-xs text-muted-foreground">
            Showing first 50 vendors — type to search for more
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

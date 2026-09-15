import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CATEGORY_MAPPING_ROWS } from '@/data/documentConstants';
import { sectorColors } from '@/data/mockData';
import { Sector } from '@/types';
import { cn } from '@/lib/utils';
import { BookOpen, Info, RotateCcw } from 'lucide-react';

const ALL = 'all';

const PALETTE = [
  'bg-chart-1/20 text-chart-1 border-chart-1/30',
  'bg-chart-2/20 text-chart-2 border-chart-2/30',
  'bg-chart-3/20 text-chart-3 border-chart-3/30',
  'bg-chart-4/20 text-chart-4 border-chart-4/30',
  'bg-chart-5/20 text-chart-5 border-chart-5/30',
  'bg-primary/15 text-primary border-primary/25',
  'bg-muted text-muted-foreground border-border',
] as const;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function colorForValue(value: string, pool: string[]): string {
  if (value in sectorColors) {
    return `${sectorColors[value as Sector]} border-transparent`;
  }
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 997;
  }
  return pool[hash % pool.length];
}

function MappingBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'max-w-full whitespace-normal text-left font-medium leading-snug px-2.5 py-1 rounded-md',
        colorForValue(value, [...PALETTE]),
        className
      )}
    >
      {value}
    </Badge>
  );
}

export default function CategoryReferencePage() {
  const [legacyFilter, setLegacyFilter] = useState(ALL);
  const [verticalFilter, setVerticalFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const legacyOptions = useMemo(
    () => uniqueSorted(CATEGORY_MAPPING_ROWS.map((r) => r.legacyLabel)),
    []
  );
  const verticalOptions = useMemo(
    () => uniqueSorted(CATEGORY_MAPPING_ROWS.map((r) => r.businessVertical)),
    []
  );
  const categoryOptions = useMemo(
    () => uniqueSorted(CATEGORY_MAPPING_ROWS.map((r) => r.productCategory)),
    []
  );

  const filtered = useMemo(() => {
    return CATEGORY_MAPPING_ROWS.filter((row) => {
      if (legacyFilter !== ALL && row.legacyLabel !== legacyFilter) return false;
      if (verticalFilter !== ALL && row.businessVertical !== verticalFilter) return false;
      if (categoryFilter !== ALL && row.productCategory !== categoryFilter) return false;
      return true;
    });
  }, [legacyFilter, verticalFilter, categoryFilter]);

  const hasFilters =
    legacyFilter !== ALL || verticalFilter !== ALL || categoryFilter !== ALL;

  const clearFilters = () => {
    setLegacyFilter(ALL);
    setVerticalFilter(ALL);
    setCategoryFilter(ALL);
  };

  const total = CATEGORY_MAPPING_ROWS.length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Category Reference</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Taxonomy map for business vertical and product category assignments
            </p>
          </div>
        </div>

        <Alert className="border-primary/20 bg-primary/5 [&>svg]:text-primary">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-primary">Read-only reference</AlertTitle>
          <AlertDescription className="text-sm text-foreground/80">
            This table is the reference standard for business vertical and product category
            assignments. Contact IT to request changes.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="space-y-4 pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Mapping table</CardTitle>
              <CardDescription>Read-only · filter by any column</CardDescription>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Legacy Label</label>
                  <Select value={legacyFilter} onValueChange={setLegacyFilter}>
                    <SelectTrigger aria-label="Filter by legacy label">
                      <SelectValue placeholder="All legacy labels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All legacy labels</SelectItem>
                      {legacyOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    New Business Vertical
                  </label>
                  <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                    <SelectTrigger aria-label="Filter by business vertical">
                      <SelectValue placeholder="All verticals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All verticals</SelectItem>
                      {verticalOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    New Product Category
                  </label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger aria-label="Filter by product category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All categories</SelectItem>
                      {categoryOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="shrink-0 w-full lg:w-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground" aria-live="polite">
              Showing {filtered.length} of {total} entries
            </p>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/60 border-b border-border bg-muted/60">
                    <TableHead className="min-w-[160px] h-12 px-4 text-xs sm:text-sm font-semibold text-foreground">
                      Legacy Label
                    </TableHead>
                    <TableHead className="min-w-[200px] h-12 px-4 text-xs sm:text-sm font-semibold text-foreground">
                      New Business Vertical
                    </TableHead>
                    <TableHead className="min-w-[220px] h-12 px-4 text-xs sm:text-sm font-semibold text-foreground">
                      New Product Category
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground py-12 px-4"
                      >
                        No rows match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row, index) => (
                      <TableRow
                        key={`${row.legacyLabel}-${row.businessVertical}-${row.productCategory}-${index}`}
                        className={cn(
                          'border-border transition-colors hover:bg-primary/5',
                          index % 2 === 1 && 'bg-muted/30'
                        )}
                      >
                        <TableCell className="px-4 py-3.5 align-middle">
                          <MappingBadge value={row.legacyLabel} />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-middle">
                          <MappingBadge value={row.businessVertical} />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-middle">
                          <MappingBadge value={row.productCategory} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

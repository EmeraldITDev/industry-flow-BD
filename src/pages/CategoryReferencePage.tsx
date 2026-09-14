import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CATEGORY_MAPPING_ROWS } from '@/data/documentConstants';
import { BookOpen, Info, Search } from 'lucide-react';

export default function CategoryReferencePage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATEGORY_MAPPING_ROWS;
    return CATEGORY_MAPPING_ROWS.filter(
      (row) =>
        row.legacyLabel.toLowerCase().includes(q) ||
        row.businessVertical.toLowerCase().includes(q) ||
        row.productCategory.toLowerCase().includes(q)
    );
  }, [search]);

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

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            This table is the reference standard for business vertical and product category
            assignments. Contact IT to request changes.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Mapping table</CardTitle>
                <CardDescription>Read-only · searchable by any column</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter rows…"
                  className="pl-9"
                  aria-label="Filter category mapping"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Legacy Label</TableHead>
                    <TableHead className="min-w-[180px]">New Business Vertical</TableHead>
                    <TableHead className="min-w-[200px]">New Product Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No rows match “{search}”
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row, index) => (
                      <TableRow key={`${row.legacyLabel}-${row.businessVertical}-${row.productCategory}-${index}`}>
                        <TableCell className="font-medium whitespace-nowrap">{row.legacyLabel}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.businessVertical}</TableCell>
                        <TableCell>{row.productCategory}</TableCell>
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

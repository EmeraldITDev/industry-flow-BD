import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useClientPagination } from '@/hooks/useClientPagination';
import { ListPager } from '@/components/ui/list-pager';
import { useDashboardExportOptional } from '@/context/DashboardExportContext';

const PAGE_SIZE = 15;

export interface AccountRow {
  account: string;
  location: string;
  accountOwner: string;
  totalOpportunities: number;
  href?: string;
  projectIds?: string[];
}

interface PipelineBySalesLeadProps {
  data: AccountRow[];
}

export default function PipelineBySalesLead({ data }: PipelineBySalesLeadProps) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.account.localeCompare(b.account)),
    [data]
  );
  const sumTotal = sortedData.reduce((s, r) => s + r.totalOpportunities, 0);
  // Exports capture every row; on screen only one page of rows is mounted.
  const exporting = useDashboardExportOptional()?.exportFullNumbers ?? false;
  const pagination = useClientPagination(sortedData, PAGE_SIZE, { showAll: exporting });

  return (
    <div className="card p-4 overflow-hidden min-w-0">
      <div className="space-y-1 mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Pipeline by Sales Lead
        </h3>
        <p className="text-xs text-muted-foreground">
          Account summary with opportunities per owner — click a count to open matching projects
        </p>
      </div>

      <ScrollArea className="h-[400px] w-full">
        <div className="min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-bold text-foreground">Accounts</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Location</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Account Owner</TableHead>
              <TableHead className="text-xs font-bold text-foreground text-right">Total Opportunities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.map((row, i) => {
              const idx = pagination.start - 1 + i;
              return (
              <TableRow key={`${row.account}-${idx}`} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <TableCell className="text-xs font-medium py-2 max-w-[140px] truncate">
                  {row.href ? <Link to={row.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">{row.account}</Link> : row.account}
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground max-w-[100px] truncate">{row.location || '—'}</TableCell>
                <TableCell className="text-xs py-2 max-w-[120px] truncate">{row.accountOwner}</TableCell>
                <TableCell className="text-xs py-2 text-right font-semibold">
                  {row.href ? (
                    <Link
                      to={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'tabular-nums text-primary underline-offset-2 hover:underline'
                      )}
                    >
                      {row.totalOpportunities}
                    </Link>
                  ) : (
                    row.totalOpportunities
                  )}
                </TableCell>
              </TableRow>
              );
            })}
            <TableRow className="border-t-2 border-foreground/20 bg-muted/40">
              <TableCell colSpan={3} className="text-xs font-bold py-2">Sum Total</TableCell>
              <TableCell className="text-xs font-bold py-2 text-right">{sumTotal}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </ScrollArea>
      <ListPager pagination={pagination} label="accounts" />
    </div>
  );
}

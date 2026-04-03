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

export interface AccountRow {
  account: string;
  location: string;
  accountOwner: string;
  totalOpportunities: number;
}

interface PipelineBySalesLeadProps {
  data: AccountRow[];
}

export default function PipelineBySalesLead({ data }: PipelineBySalesLeadProps) {
  const sortedData = [...data].sort((a, b) => a.account.localeCompare(b.account));
  const sumTotal = sortedData.reduce((s, r) => s + r.totalOpportunities, 0);

  return (
    <div className="card p-4 overflow-visible">
      <div className="space-y-1 mb-4 pr-10">
        <h3 className="text-base font-semibold text-foreground">
          Pipeline by Sales Lead
        </h3>
        <p className="text-xs text-muted-foreground">
          Account summary with opportunities per owner
        </p>
      </div>

      <ScrollArea className="h-[400px] overflow-x-auto">
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
            {sortedData.map((row, idx) => (
              <TableRow key={`${row.account}-${idx}`} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <TableCell className="text-xs font-medium py-2">{row.account}</TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">{row.location || '—'}</TableCell>
                <TableCell className="text-xs py-2">{row.accountOwner}</TableCell>
                <TableCell className="text-xs py-2 text-right font-semibold">{row.totalOpportunities}</TableCell>
              </TableRow>
            ))}
            {/* Sum Total row */}
            <TableRow className="border-t-2 border-foreground/20 bg-muted/40">
              <TableCell colSpan={3} className="text-xs font-bold py-2">Sum Total</TableCell>
              <TableCell className="text-xs font-bold py-2 text-right">{sumTotal}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
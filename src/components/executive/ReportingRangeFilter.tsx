import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  REPORTING_PERIODS,
  ReportingPeriodKey,
  ReportingRange,
  parseIsoDate,
} from '@/lib/executive/reportingPeriod';

interface Props {
  range: ReportingRange;
  onPreset: (key: Exclude<ReportingPeriodKey, 'custom'>) => void;
  onCustom: (next: { from?: Date; to?: Date }) => void;
}

export function ReportingRangeFilter({ range, onPreset, onCustom }: Props) {
  const fromDate = parseIsoDate(range.from);
  const toDate = parseIsoDate(range.to);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-1.5">
        {REPORTING_PERIODS.filter((p) => p.key !== 'custom').map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={range.key === p.key ? 'default' : 'outline'}
            onClick={() => onPreset(p.key as Exclude<ReportingPeriodKey, 'custom'>)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker
          value={fromDate}
          placeholder="Start date"
          onSelect={(date) => onCustom({ from: date, to: toDate })}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <DatePicker
          value={toDate}
          placeholder="End date"
          onSelect={(date) => onCustom({ from: fromDate, to: date })}
        />
      </div>
    </div>
  );
}

function DatePicker({
  value,
  placeholder,
  onSelect,
}: {
  value?: Date;
  placeholder: string;
  onSelect: (date?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('justify-start text-left font-normal min-w-[9.5rem]', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value ? format(value, 'PP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onSelect} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

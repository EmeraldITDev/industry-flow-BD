import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Allow typing a value that is not in the options list. */
  allowCreate?: boolean;
  createLabel?: (query: string) => string;
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  allowCreate = false,
  createLabel = (q) => `Add "${q}"`,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel =
    options.find((o) => o.value === value)?.label || (value ? value : undefined);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const trimmedQuery = query.trim();
  const canCreate =
    allowCreate &&
    trimmedQuery.length > 0 &&
    !options.some((o) => o.value.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !options.some((o) => o.label.toLowerCase() === trimmedQuery.toLowerCase());

  const selectValue = (next: string) => {
    onValueChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      // false: nested inside Sheet/Dialog; modal=true fights the sheet dismiss layer and drops clicks.
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-10"
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[--radix-popover-trigger-width] p-0 flex flex-col overflow-hidden max-h-[min(24rem,var(--radix-popover-content-available-height))]"
        align="start"
        side="bottom"
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="min-h-0">
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-none min-h-0 flex-1">
            <CommandEmpty>
              {canCreate ? 'Press enter or choose Add below.' : emptyText}
            </CommandEmpty>
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedQuery}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => selectValue(trimmedQuery)}
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{createLabel(trimmedQuery)}</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => selectValue(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

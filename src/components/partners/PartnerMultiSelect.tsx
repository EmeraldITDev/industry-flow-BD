import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelationshipStageBadge } from '@/components/partners/RelationshipStageBadge';
import {
  PartnerForm,
  emptyPartnerForm,
  formValuesToPayload,
  type PartnerFormValues,
} from '@/components/partners/PartnerForm';
import { partnersService } from '@/services/partners';
import type { Partner } from '@/types/partners';
import { toast } from 'sonner';

interface PartnerMultiSelectProps {
  values: string[];
  onValuesChange: (ids: string[]) => void;
  /** Pre-loaded partners for selected IDs (labels). */
  selectedPartners?: Partner[];
  disabled?: boolean;
  placeholder?: string;
}

export function PartnerMultiSelect({
  values,
  onValuesChange,
  selectedPartners = [],
  disabled = false,
  placeholder = 'Select partners',
}: PartnerMultiSelectProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [options, setOptions] = useState<Partner[]>([]);
  const [searching, setSearching] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valueSet = useMemo(() => new Set(values), [values]);

  const labelMap = useMemo(() => {
    const map = new Map<string, Partner>();
    for (const p of selectedPartners) map.set(p.id, p);
    for (const p of options) map.set(p.id, p);
    return map;
  }, [selectedPartners, options]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    partnersService
      .getAll({ search: debouncedQuery || undefined })
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof formValuesToPayload>) =>
      partnersService.create(payload),
    onSuccess: (partner) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      onValuesChange([...values, partner.id]);
      setOptions((prev) => [partner, ...prev.filter((p) => p.id !== partner.id)]);
      toast.success('Partner created and selected');
      setAddOpen(false);
    },
    onError: () => toast.error('Failed to create partner'),
  });

  const toggleValue = (id: string) => {
    if (valueSet.has(id)) {
      onValuesChange(values.filter((v) => v !== id));
    } else {
      onValuesChange([...values, id]);
    }
  };

  const removeValue = (id: string, e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== id));
  };

  const handleCreate = async (formValues: PartnerFormValues) => {
    setSubmitting(true);
    try {
      await createMutation.mutateAsync(formValuesToPayload(formValues));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Popover
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
            className="w-full justify-between font-normal h-auto min-h-10 py-1.5"
          >
            <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
              {values.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                values.map((id) => {
                  const partner = labelMap.get(id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1 text-xs max-w-[200px]"
                    >
                      <span className="truncate">
                        {partner?.companyName ?? `Partner #${id}`}
                      </span>
                      <span
                        role="button"
                        tabIndex={-1}
                        className="w-3 h-3 cursor-pointer inline-flex items-center justify-center shrink-0"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeValue(id, e);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </Badge>
                  );
                })
              )}
            </div>
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
              placeholder="Search partners..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-none min-h-0 flex-1">
              <CommandEmpty>
                {searching ? 'Searching…' : 'No partners found.'}
              </CommandEmpty>
              <CommandGroup>
                {options.map((partner) => (
                  <CommandItem
                    key={partner.id}
                    value={partner.companyName}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => toggleValue(partner.id)}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Check
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          valueSet.has(partner.id) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {partner.companyName}
                        </p>
                        <div className="mt-1">
                          <RelationshipStageBadge
                            stage={partner.relationshipStage}
                            className="text-[10px] px-1.5 py-0"
                          />
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  value="__add_new_partner__"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => {
                    setOpen(false);
                    setAddOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  Add New Partner
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 text-left">
            <SheetTitle>Add Partner</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <PartnerForm
              initial={emptyPartnerForm()}
              submitting={submitting}
              submitLabel="Create Partner"
              onCancel={() => setAddOpen(false)}
              onSubmit={handleCreate}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RelationshipStageBadge } from '@/components/partners/RelationshipStageBadge';
import { LinkScmVendorModal } from '@/components/partners/LinkScmVendorModal';
import {
  PartnerForm,
  emptyPartnerForm,
  formValuesToPayload,
  type PartnerFormValues,
} from '@/components/partners/PartnerForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { partnersService } from '@/services/partners';
import type { Partner } from '@/types/partners';
import { toast } from 'sonner';

const ADD_PARTNER_FORM_ID = 'partner-multi-select-add-form';

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
  const [scmPromptPartner, setScmPromptPartner] = useState<Partner | null>(null);
  const [scmLinkPartner, setScmLinkPartner] = useState<Partner | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['partners-list'] });
      onValuesChange([...values, partner.id]);
      setOptions((prev) => [partner, ...prev.filter((p) => p.id !== partner.id)]);
      toast.success('Partner created and selected');
      setAddOpen(false);
      // Optional SCM link — non-blocking; project form stays open underneath.
      setScmPromptPartner(partner);
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
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <SheetHeader className="shrink-0 space-y-1.5 border-b px-8 pb-5 pt-8 pr-14 text-left">
            <SheetTitle>Add Partner</SheetTitle>
            <SheetDescription>
              Create a partner and add them to this opportunity without leaving
              the form.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-8 py-6">
              <PartnerForm
                formId={ADD_PARTNER_FORM_ID}
                initial={emptyPartnerForm()}
                submitting={submitting}
                showActions={false}
                onSubmit={handleCreate}
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 flex-row justify-end gap-3 border-t px-8 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={ADD_PARTNER_FORM_ID}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Partner
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!scmPromptPartner}
        onOpenChange={(open) => {
          if (!open) setScmPromptPartner(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link to SCM vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              {scmPromptPartner
                ? `${scmPromptPartner.companyName} was created and selected. Optionally link it to an SCM vendor now — you can also do this later from the partner profile.`
                : 'Optionally link this partner to an SCM vendor now.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (scmPromptPartner) setScmLinkPartner(scmPromptPartner);
                setScmPromptPartner(null);
              }}
            >
              Link SCM vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkScmVendorModal
        open={!!scmLinkPartner}
        onOpenChange={(open) => {
          if (!open) setScmLinkPartner(null);
        }}
        partnerId={scmLinkPartner?.id ?? ''}
        partnerName={scmLinkPartner?.companyName}
      />
    </>
  );
}

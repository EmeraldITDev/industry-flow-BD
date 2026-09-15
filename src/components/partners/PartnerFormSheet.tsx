import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PartnerForm,
  emptyPartnerForm,
  formValuesToPayload,
  partnerToFormValues,
  type PartnerFormValues,
} from '@/components/partners/PartnerForm';
import { partnersService } from '@/services/partners';
import type { Partner } from '@/types/partners';
import { toast } from 'sonner';
import { useState } from 'react';

interface PartnerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onCreated?: (partner: Partner) => void;
  onUpdated?: (partner: Partner) => void;
}

export function PartnerFormSheet({
  open,
  onOpenChange,
  partner,
  onCreated,
  onUpdated,
}: PartnerFormSheetProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!partner;

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof formValuesToPayload>) =>
      partnersService.create(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner created');
      onCreated?.(created);
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to create partner'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof formValuesToPayload>) =>
      partnersService.update(partner!.id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner', partner!.id] });
      toast.success('Partner updated');
      onUpdated?.(updated);
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update partner'),
  });

  const handleSubmit = async (values: PartnerFormValues) => {
    setSubmitting(true);
    try {
      const payload = formValuesToPayload(values);
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 text-left">
          <SheetTitle>{isEdit ? 'Edit Partner' : 'Add Partner'}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <PartnerForm
            key={partner?.id ?? 'new'}
            initial={partner ? partnerToFormValues(partner) : emptyPartnerForm()}
            submitting={submitting}
            submitLabel={isEdit ? 'Save Changes' : 'Create Partner'}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

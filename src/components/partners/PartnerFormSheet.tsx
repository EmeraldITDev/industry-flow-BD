import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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
import { Loader2 } from 'lucide-react';

interface PartnerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onCreated?: (partner: Partner) => void;
  onUpdated?: (partner: Partner) => void;
}

const FORM_ID = 'partner-form-sheet';

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
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 space-y-1.5 border-b px-8 pb-5 pt-8 pr-14 text-left">
          <SheetTitle>{isEdit ? 'Edit Partner' : 'Add Partner'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update relationship details, owners, and engagement notes.'
              : 'Capture company details, owners, and relationship stage.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            <PartnerForm
              key={partner?.id ?? 'new'}
              formId={FORM_ID}
              initial={
                partner ? partnerToFormValues(partner) : emptyPartnerForm()
              }
              submitting={submitting}
              showActions={false}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-3 border-t px-8 py-4 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Partner'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSearchableSelect } from '@/components/ui/multi-searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { businessVerticals } from '@/data/mockData';
import { PRODUCT_OPTIONS } from '@/data/productCatalog';
import { teamService } from '@/services/team';
import {
  RELATIONSHIP_STAGES,
  type CreatePartnerData,
  type Partner,
  type RelationshipStage,
} from '@/types/partners';

export type PartnerFormValues = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  relationshipOwnerIds: string[];
  relationshipStage: RelationshipStage | string;
  verticals: string[];
  productCategories: string[];
  nextAction: string;
  notes: string;
};

export function emptyPartnerForm(): PartnerFormValues {
  return {
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    relationshipOwnerIds: [],
    relationshipStage: 'Prospecting',
    verticals: [],
    productCategories: [],
    nextAction: '',
    notes: '',
  };
}

export function partnerToFormValues(partner: Partner): PartnerFormValues {
  return {
    companyName: partner.companyName,
    contactPerson: partner.contactPerson ?? '',
    email: partner.email ?? '',
    phone: partner.phone ?? '',
    relationshipOwnerIds: partner.relationshipOwnerIds ?? [],
    relationshipStage: partner.relationshipStage || 'Prospecting',
    verticals: partner.verticals ?? [],
    productCategories: partner.productCategories ?? [],
    nextAction: partner.nextAction ?? '',
    notes: partner.notes ?? '',
  };
}

export function formValuesToPayload(values: PartnerFormValues): CreatePartnerData {
  return {
    companyName: values.companyName.trim(),
    contactPerson: values.contactPerson.trim() || undefined,
    email: values.email.trim() || undefined,
    phone: values.phone.trim() || undefined,
    relationshipOwnerIds: values.relationshipOwnerIds,
    relationshipStage: values.relationshipStage,
    verticals: values.verticals,
    productCategories: values.productCategories,
    nextAction: values.nextAction.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

interface PartnerFormProps {
  initial?: PartnerFormValues;
  submitting?: boolean;
  submitLabel?: string;
  /** When false, omit Cancel/Submit — parent sheet owns the footer. */
  showActions?: boolean;
  onSubmit: (values: PartnerFormValues) => void | Promise<void>;
  onCancel?: () => void;
  formId?: string;
}

export function PartnerForm({
  initial,
  submitting = false,
  submitLabel = 'Save Partner',
  showActions = true,
  onSubmit,
  onCancel,
  formId = 'partner-form',
}: PartnerFormProps) {
  const [values, setValues] = useState<PartnerFormValues>(
    initial ?? emptyPartnerForm()
  );

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const ownerOptions = teamMembers.map((m: any) => ({
    value: String(m.id),
    label: m.name || m.email || String(m.id),
  }));

  const verticalOptions = businessVerticals.map((v) => ({
    value: v,
    label: v,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.companyName.trim()) return;
    onSubmit(values);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2.5">
        <Label htmlFor="partner-company">
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="partner-company"
          value={values.companyName}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, companyName: e.target.value }))
          }
          placeholder="Partner company name"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label htmlFor="partner-contact">Contact Person</Label>
          <Input
            id="partner-contact"
            value={values.contactPerson}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, contactPerson: e.target.value }))
            }
            placeholder="Primary contact"
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="partner-email">Email</Label>
          <Input
            id="partner-email"
            type="email"
            value={values.email}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="contact@company.com"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="partner-phone">Phone</Label>
        <Input
          id="partner-phone"
          value={values.phone}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="+234 ..."
        />
      </div>

      <div className="space-y-2.5">
        <Label>Relationship Owners</Label>
        <MultiSearchableSelect
          values={values.relationshipOwnerIds}
          onValuesChange={(relationshipOwnerIds) =>
            setValues((prev) => ({ ...prev, relationshipOwnerIds }))
          }
          options={ownerOptions}
          placeholder="Select relationship owners"
          searchPlaceholder="Search team..."
          emptyText="No team members found."
        />
        {values.relationshipOwnerIds.length > 1 && (
          <Alert className="border-amber-500/40 bg-amber-500/10 py-3">
            <Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
              Multiple owners assigned — this partner will be flagged on the list
              view.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2.5">
        <Label>Relationship Stage</Label>
        <Select
          value={values.relationshipStage}
          onValueChange={(relationshipStage) =>
            setValues((prev) => ({ ...prev, relationshipStage }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label>Verticals</Label>
        <MultiSearchableSelect
          values={values.verticals}
          onValuesChange={(verticals) =>
            setValues((prev) => ({ ...prev, verticals }))
          }
          options={verticalOptions}
          placeholder="Select verticals"
          searchPlaceholder="Search verticals..."
        />
      </div>

      <div className="space-y-2.5">
        <Label>Product Categories</Label>
        <MultiSearchableSelect
          values={values.productCategories}
          onValuesChange={(productCategories) =>
            setValues((prev) => ({ ...prev, productCategories }))
          }
          options={PRODUCT_OPTIONS}
          placeholder="Select product categories"
          searchPlaceholder="Search products..."
        />
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="partner-next-action">Next Action</Label>
        <Textarea
          id="partner-next-action"
          value={values.nextAction}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, nextAction: e.target.value }))
          }
          placeholder="What should happen next?"
          rows={3}
        />
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="partner-notes">Notes</Label>
        <Textarea
          id="partner-notes"
          value={values.notes}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Additional notes"
          rows={3}
        />
      </div>

      {showActions && (
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting || !values.companyName.trim()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

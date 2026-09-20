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
import { businessVerticals } from '@/data/mockData';
import { PRODUCT_OPTIONS, getSubproductOptions } from '@/data/productCatalog';
import { teamService } from '@/services/team';
import {
  AGREEMENT_TYPES,
  ENGAGEMENT_STATUSES,
  PARTNER_TYPES,
  RELATIONSHIP_STAGES,
  STRATEGIC_VALUES,
  type CreatePartnerData,
  type Partner,
  type RelationshipStage,
} from '@/types/partners';

export type PartnerFormValues = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  type: string[];
  agreementType: string;
  specialization: string;
  website: string;
  location: string;
  strategicValue: string;
  engagementStatus: string;
  relationshipOwnerIds: string[];
  relationshipStage: RelationshipStage | string;
  verticals: string[];
  productCategories: string[];
  subProductCategories: string[];
  nextAction: string;
  notes: string;
};

const NONE = '__none__';

export function emptyPartnerForm(): PartnerFormValues {
  return {
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    type: [],
    agreementType: '',
    specialization: '',
    website: '',
    location: '',
    strategicValue: '',
    engagementStatus: '',
    relationshipOwnerIds: [],
    relationshipStage: 'Identified',
    verticals: [],
    productCategories: [],
    subProductCategories: [],
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
    type: partner.type ?? [],
    agreementType: partner.agreementType ?? '',
    specialization: partner.specialization ?? '',
    website: partner.website ?? '',
    location: partner.location ?? '',
    strategicValue: partner.strategicValue ?? '',
    engagementStatus: partner.engagementStatus ?? '',
    relationshipOwnerIds: partner.relationshipOwnerIds ?? [],
    relationshipStage: partner.relationshipStage || 'Identified',
    verticals: partner.verticals ?? [],
    productCategories: partner.productCategories ?? [],
    subProductCategories: partner.subProductCategories ?? [],
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
    type: values.type,
    agreementType: values.agreementType.trim() || null,
    specialization: values.specialization.trim() || undefined,
    website: values.website.trim() || undefined,
    location: values.location.trim() || undefined,
    strategicValue: values.strategicValue.trim() || null,
    engagementStatus: values.engagementStatus.trim() || null,
    relationshipOwnerIds: values.relationshipOwnerIds,
    relationshipStage: values.relationshipStage,
    verticals: values.verticals,
    productCategories: values.productCategories,
    subProductCategories: values.subProductCategories,
    nextAction: values.nextAction.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

interface PartnerFormProps {
  initial?: PartnerFormValues;
  submitting?: boolean;
  submitLabel?: string;
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

  const typeOptions = PARTNER_TYPES.map((t) => ({ value: t, label: t }));

  const handleProductsChange = (productCategories: string[]) => {
    const allowed = new Set(
      getSubproductOptions(productCategories).map((o) => o.value)
    );
    setValues((prev) => ({
      ...prev,
      productCategories,
      subProductCategories: prev.subProductCategories.filter((sp) =>
        allowed.has(sp)
      ),
    }));
  };

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

      <div className="grid gap-5 sm:grid-cols-2">
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
          <Label htmlFor="partner-website">Website</Label>
          <Input
            id="partner-website"
            value={values.website}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, website: e.target.value }))
            }
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="partner-location">Location</Label>
        <Input
          id="partner-location"
          value={values.location}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="City, Country"
        />
      </div>

      <div className="space-y-2.5">
        <Label>Type</Label>
        <MultiSearchableSelect
          values={values.type}
          onValuesChange={(type) => setValues((prev) => ({ ...prev, type }))}
          options={typeOptions}
          placeholder="Select partner types"
          searchPlaceholder="Search types..."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label>Agreement Type</Label>
          <Select
            value={values.agreementType || NONE}
            onValueChange={(v) =>
              setValues((prev) => ({
                ...prev,
                agreementType: v === NONE ? '' : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select agreement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {AGREEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2.5">
          <Label>Strategic Value</Label>
          <Select
            value={values.strategicValue || NONE}
            onValueChange={(v) =>
              setValues((prev) => ({
                ...prev,
                strategicValue: v === NONE ? '' : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select strategic value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {STRATEGIC_VALUES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label>Engagement Status</Label>
          <Select
            value={values.engagementStatus || NONE}
            onValueChange={(v) =>
              setValues((prev) => ({
                ...prev,
                engagementStatus: v === NONE ? '' : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select engagement status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {ENGAGEMENT_STATUSES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="partner-specialization">Specialization</Label>
        <Textarea
          id="partner-specialization"
          value={values.specialization}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, specialization: e.target.value }))
          }
          placeholder="Capabilities, focus areas, OEMs supported…"
          rows={2}
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
          onValuesChange={handleProductsChange}
          options={PRODUCT_OPTIONS}
          placeholder="Select product categories"
          searchPlaceholder="Search products..."
        />
      </div>

      <div className="space-y-2.5">
        <Label>Sub Product Categories</Label>
        <MultiSearchableSelect
          values={values.subProductCategories}
          onValuesChange={(subProductCategories) =>
            setValues((prev) => ({ ...prev, subProductCategories }))
          }
          options={(() => {
            const catalogOptions = getSubproductOptions(values.productCategories);
            const extraSaved = values.subProductCategories
              .filter((sp) => !catalogOptions.some((o) => o.value === sp))
              .map((sp) => ({ value: sp, label: sp }));
            return [...catalogOptions, ...extraSaved];
          })()}
          disabled={values.productCategories.length === 0}
          placeholder={
            values.productCategories.length === 0
              ? 'Select a product first'
              : 'Select sub products'
          }
          searchPlaceholder="Search or add sub products..."
          allowCreate
          createLabel={(q) => `Add sub product "${q}"`}
          emptyText="No sub products found. Type to add a new one."
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

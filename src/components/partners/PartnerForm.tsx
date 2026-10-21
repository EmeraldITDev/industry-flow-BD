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
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Star, Trash2, Users } from 'lucide-react';
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
  type PartnerContact,
  type RelationshipStage,
} from '@/types/partners';

const newContactId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function emptyContact(isPrimary = false): PartnerContact {
  return {
    id: newContactId(),
    name: '',
    email: '',
    phone: '',
    title: '',
    isPrimary,
  };
}

function contactsFromPartner(partner: Partner): PartnerContact[] {
  if (partner.contacts && partner.contacts.length > 0) {
    return partner.contacts.map((c) => ({
      id: c.id || newContactId(),
      name: c.name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      title: c.title ?? '',
      isPrimary: Boolean(c.isPrimary),
    }));
  }
  if (partner.contactPerson || partner.email || partner.phone) {
    return [
      {
        id: newContactId(),
        name: partner.contactPerson ?? '',
        email: partner.email ?? '',
        phone: partner.phone ?? '',
        title: '',
        isPrimary: true,
      },
    ];
  }
  return [emptyContact(true)];
}

export type PartnerFormValues = {
  companyName: string;
  contacts: PartnerContact[];
  type: string[];
  agreementType: string;
  validThru: string;
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
  notes: string;
};

const NONE = '__none__';

export function emptyPartnerForm(): PartnerFormValues {
  return {
    companyName: '',
    contacts: [emptyContact(true)],
    type: [],
    agreementType: '',
    validThru: '',
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
    notes: '',
  };
}

export function partnerToFormValues(partner: Partner): PartnerFormValues {
  return {
    companyName: partner.companyName,
    contacts: contactsFromPartner(partner),
    type: partner.type ?? [],
    agreementType: partner.agreementType ?? '',
    validThru: partner.validThru ?? '',
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
    notes: partner.notes ?? '',
  };
}

export function formValuesToPayload(values: PartnerFormValues): CreatePartnerData {
  const contacts = values.contacts
    .map((c) => ({
      id: c.id,
      name: (c.name ?? '').trim() || undefined,
      email: (c.email ?? '').trim() || undefined,
      phone: (c.phone ?? '').trim() || undefined,
      title: (c.title ?? '').trim() || undefined,
      isPrimary: Boolean(c.isPrimary),
    }))
    .filter((c) => c.name || c.email || c.phone || c.title);

  if (contacts.length > 0 && !contacts.some((c) => c.isPrimary)) {
    contacts[0].isPrimary = true;
  }

  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];

  return {
    companyName: values.companyName.trim(),
    contacts,
    contactPerson: primary?.name,
    email: primary?.email,
    phone: primary?.phone,
    type: values.type,
    agreementType: values.agreementType.trim() || null,
    validThru: values.validThru.trim() || null,
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
    setValues((prev) => {
      const allowed = new Set(
        getSubproductOptions(productCategories).map((o) => o.value)
      );
      const removed = new Set(
        getSubproductOptions(
          prev.productCategories.filter((p) => !productCategories.includes(p))
        ).map((o) => o.value)
      );
      return {
        ...prev,
        productCategories,
        subProductCategories: prev.subProductCategories.filter(
          (sp) => allowed.has(sp) || !removed.has(sp)
        ),
      };
    });
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Contacts</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Add multiple contacts. The primary contact is used on reports.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setValues((prev) => ({
                ...prev,
                contacts: [
                  ...prev.contacts,
                  emptyContact(prev.contacts.length === 0),
                ],
              }))
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add contact
          </Button>
        </div>

        <div className="space-y-3">
          {values.contacts.map((contact, index) => (
            <div
              key={contact.id}
              className="rounded-lg border p-3 sm:p-4 space-y-3 bg-muted/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Contact {index + 1}
                  </p>
                  {contact.isPrimary && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!contact.isPrimary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          contacts: prev.contacts.map((c) => ({
                            ...c,
                            isPrimary: c.id === contact.id,
                          })),
                        }))
                      }
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Set primary
                    </Button>
                  )}
                  {values.contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setValues((prev) => {
                          const next = prev.contacts.filter(
                            (c) => c.id !== contact.id,
                          );
                          if (next.length > 0 && !next.some((c) => c.isPrimary)) {
                            next[0] = { ...next[0], isPrimary: true };
                          }
                          return { ...prev, contacts: next };
                        })
                      }
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`partner-contact-name-${contact.id}`}>
                    Name
                  </Label>
                  <Input
                    id={`partner-contact-name-${contact.id}`}
                    value={contact.name ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        contacts: prev.contacts.map((c) =>
                          c.id === contact.id
                            ? { ...c, name: e.target.value }
                            : c,
                        ),
                      }))
                    }
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner-contact-title-${contact.id}`}>
                    Title / designation
                  </Label>
                  <Input
                    id={`partner-contact-title-${contact.id}`}
                    value={contact.title ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        contacts: prev.contacts.map((c) =>
                          c.id === contact.id
                            ? { ...c, title: e.target.value }
                            : c,
                        ),
                      }))
                    }
                    placeholder="Optional (e.g. Account Manager)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner-contact-email-${contact.id}`}>
                    Email
                  </Label>
                  <Input
                    id={`partner-contact-email-${contact.id}`}
                    type="email"
                    value={contact.email ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        contacts: prev.contacts.map((c) =>
                          c.id === contact.id
                            ? { ...c, email: e.target.value }
                            : c,
                        ),
                      }))
                    }
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`partner-contact-phone-${contact.id}`}>
                    Phone
                  </Label>
                  <Input
                    id={`partner-contact-phone-${contact.id}`}
                    value={contact.phone ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        contacts: prev.contacts.map((c) =>
                          c.id === contact.id
                            ? { ...c, phone: e.target.value }
                            : c,
                        ),
                      }))
                    }
                    placeholder="+234 ..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
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
        <div className="space-y-2.5">
          <Label htmlFor="partner-location-inline">Location</Label>
          <Input
            id="partner-location-inline"
            value={values.location}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="City, Country"
          />
        </div>
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
          <Label htmlFor="partner-valid-thru">Valid Thru (optional)</Label>
          <Input
            id="partner-valid-thru"
            type="date"
            value={values.validThru}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, validThru: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Partnership agreement expiry date, if known.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
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
          options={(() => {
            const extraSaved = values.productCategories
              .filter((p) => !PRODUCT_OPTIONS.some((o) => o.value === p))
              .map((p) => ({ value: p, label: p }));
            return [...PRODUCT_OPTIONS, ...extraSaved];
          })()}
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

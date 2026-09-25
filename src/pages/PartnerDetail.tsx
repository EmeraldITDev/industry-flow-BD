import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Link2,
  Loader2,
  Pencil,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { partnersService } from '@/services/partners';
import {
  KycStatusBadge,
  RelationshipStageBadge,
} from '@/components/partners/RelationshipStageBadge';
import { PartnerFormSheet } from '@/components/partners/PartnerFormSheet';
import { LinkScmVendorModal } from '@/components/partners/LinkScmVendorModal';
import { sectorColors } from '@/data/mockData';
import type { Sector } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children || '—'}</div>
    </div>
  );
}

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const {
    data: partner,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersService.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => partnersService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner deleted');
      navigate('/partners');
    },
    onError: () => toast.error('Failed to delete partner'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 sm:p-6 lg:p-8 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading partner…
      </div>
    );
  }

  if (isError || !partner) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8 py-10 text-center">
        <p className="text-muted-foreground">Partner not found.</p>
        <Button variant="outline" onClick={() => navigate('/partners')}>
          Back to Partner Tracker
        </Button>
      </div>
    );
  }

  const multiOwner = partner.relationshipOwnerIds.length > 1;
  const ownerNames =
    partner.relationshipOwners?.map((o) => o.name).filter(Boolean) ?? [];
  const hasScmLink = !!partner.scmVendorId;
  const scmUnavailable = hasScmLink && partner.scmData === null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            asChild
          >
            <Link to="/partners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Partner Tracker
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {partner.companyName}
            </h1>
            <RelationshipStageBadge stage={partner.relationshipStage} />
            {multiOwner && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle className="h-3 w-3" />
                Multiple owners
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 self-start">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete partner?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove{' '}
                  <span className="font-medium text-foreground">
                    {partner.companyName}
                  </span>{' '}
                  and unlink it from any opportunities. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteMutation.mutate();
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete partner'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">Partner Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 p-4 sm:p-6 pt-0">
            <Field label="Contact Person">{partner.contactPerson}</Field>
            <Field label="Email">{partner.email}</Field>
            <Field label="Phone">{partner.phone}</Field>
            <Field label="Website">
              {partner.website ? (
                <a
                  href={
                    /^https?:\/\//i.test(partner.website)
                      ? partner.website
                      : `https://${partner.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {partner.website}
                </a>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Location">{partner.location}</Field>
            <Field label="Linked Opportunities">
              <Link
                to={`/projects?partner_id=${partner.id}`}
                className="text-primary hover:underline tabular-nums"
              >
                {partner.linkedOpportunitiesCount ?? 0}
              </Link>
            </Field>
            <Field label="Volume">
              <span className="tabular-nums">
                {(partner.totalValueUsd ?? 0) > 0
                  ? `$${(partner.totalValueUsd ?? 0).toLocaleString()}`
                  : '—'}
                {(partner.totalValueNgn ?? 0) > 0
                  ? ` · ₦${(partner.totalValueNgn ?? 0).toLocaleString()}`
                  : ''}
              </span>
            </Field>
            <Field label="Type">
              {(partner.type ?? []).length === 0 ? (
                '—'
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {partner.type.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Agreement Type">{partner.agreementType}</Field>
            <Field label="Valid Thru">
              {partner.validThru
                ? new Date(partner.validThru).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </Field>
            <Field label="Strategic Value">{partner.strategicValue}</Field>
            <Field label="Engagement Status">{partner.engagementStatus}</Field>
            <Field label="Relationship Owners">
              {ownerNames.length > 0
                ? ownerNames.join(', ')
                : partner.relationshipOwnerIds.length > 0
                  ? `${partner.relationshipOwnerIds.length} assigned`
                  : '—'}
            </Field>
            <Field label="Relationship Stage">
              <RelationshipStageBadge stage={partner.relationshipStage} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Specialization">
                <p className="whitespace-pre-wrap font-normal text-muted-foreground">
                  {partner.specialization?.trim() || '—'}
                </p>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Verticals">
                {partner.verticals.length === 0 ? (
                  '—'
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {partner.verticals.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className={cn(
                          'text-xs font-normal',
                          sectorColors[v as Sector] ??
                            'bg-muted text-muted-foreground'
                        )}
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Product Categories">
                {partner.productCategories.length === 0 ? (
                  '—'
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {partner.productCategories.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs font-normal">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Sub Product Categories">
                {(partner.subProductCategories ?? []).length === 0 ? (
                  '—'
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {partner.subProductCategories.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs font-normal">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <p className="whitespace-pre-wrap font-normal text-muted-foreground">
                  {partner.notes?.trim() || '—'}
                </p>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">SCM Vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {!hasScmLink && (
              <>
                <p className="text-sm text-muted-foreground">
                  No SCM vendor is linked to this partner yet.
                </p>
                <Button onClick={() => setLinkOpen(true)} className="w-full">
                  <Link2 className="mr-2 h-4 w-4" />
                  Link to SCM Vendor
                </Button>
              </>
            )}

            {hasScmLink && scmUnavailable && (
              <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                SCM data unavailable
              </p>
            )}

            {hasScmLink && partner.scmData && (
              <div className="space-y-3">
                <Field label="Vendor ID">
                  {partner.scmData.vendorId || partner.scmVendorId}
                </Field>
                <Field label="KYC Status">
                  <KycStatusBadge status={partner.scmData.kycStatus} />
                </Field>
                <Field label="Active Status">
                  {typeof partner.scmData.activeStatus === 'boolean'
                    ? partner.scmData.activeStatus
                      ? 'Active'
                      : 'Inactive'
                    : partner.scmData.activeStatus || '—'}
                </Field>
                <Field label="Category">
                  {partner.scmData.category || '—'}
                </Field>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLinkOpen(true)}
                >
                  Change SCM Vendor
                </Button>
              </div>
            )}

            {hasScmLink && partner.scmData === undefined && (
              <div className="space-y-3">
                <Field label="Vendor ID">{partner.scmVendorId}</Field>
                <p className="text-xs text-muted-foreground">
                  Detailed SCM fields were not included in this response.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLinkOpen(true)}
                >
                  Change SCM Vendor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PartnerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        partner={partner}
      />
      <LinkScmVendorModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        partnerId={partner.id}
        partnerName={partner.companyName}
      />
    </div>
  );
}

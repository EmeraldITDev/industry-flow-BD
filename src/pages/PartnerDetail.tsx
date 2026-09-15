import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Link2,
  Loader2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { partnersService } from '@/services/partners';
import {
  KycStatusBadge,
  RelationshipStageBadge,
} from '@/components/partners/RelationshipStageBadge';
import { PartnerFormSheet } from '@/components/partners/PartnerFormSheet';
import { LinkScmVendorModal } from '@/components/partners/LinkScmVendorModal';
import { safeFormatDate } from '@/lib/dateUtils';
import { sectorColors } from '@/data/mockData';
import type { Sector } from '@/types';
import { cn } from '@/lib/utils';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium">{children || '—'}</div>
    </div>
  );
}

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading partner…
      </div>
    );
  }

  if (isError || !partner) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Partner not found.</p>
        <Button variant="outline" onClick={() => navigate('/partners')}>
          Back to Partner Tracker
        </Button>
      </div>
    );
  }

  const multiOwner = partner.bdOwnerIds.length > 1;
  const ownerNames =
    partner.bdOwners?.map((o) => o.name).filter(Boolean) ?? [];
  const hasScmLink = !!partner.scmVendorId;
  const scmUnavailable = hasScmLink && partner.scmData === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            asChild
          >
            <Link to="/partners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Partner Tracker
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
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
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Partner Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact Person">{partner.contactPerson}</Field>
            <Field label="Email">{partner.email}</Field>
            <Field label="Phone">{partner.phone}</Field>
            <Field label="Last Contact Date">
              {safeFormatDate(partner.lastContactDate, 'MMM d, yyyy', '—')}
            </Field>
            <Field label="BD Owners">
              {ownerNames.length > 0
                ? ownerNames.join(', ')
                : partner.bdOwnerIds.length > 0
                  ? `${partner.bdOwnerIds.length} assigned`
                  : '—'}
            </Field>
            <Field label="Relationship Stage">
              <RelationshipStageBadge stage={partner.relationshipStage} />
            </Field>
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
              <Field label="Next Action">{partner.nextAction}</Field>
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
          <CardHeader>
            <CardTitle className="text-base">SCM Vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

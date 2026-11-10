import { PARTNER_DOCUMENT_TYPES } from '@/data/documentConstants';
import { partnerDocumentsService } from '@/services/documents';
import { OwnedDocumentsSection } from '@/components/documents/OwnedDocumentsSection';

type Props = {
  partnerId: string;
  canManage?: boolean;
};

export function PartnerDocumentsSection({ partnerId, canManage = true }: Props) {
  return (
    <OwnedDocumentsSection
      ownerId={partnerId}
      ownerLabel="partner"
      queryKey="partner-documents"
      service={partnerDocumentsService}
      documentTypes={PARTNER_DOCUMENT_TYPES}
      title="Partner Documents"
      description="Agreements, equipment lists, capability decks and other partner files"
      canManage={canManage}
    />
  );
}

import { OPPORTUNITY_DOCUMENT_TYPES } from '@/data/documentConstants';
import { opportunityDocumentsService } from '@/services/documents';
import { OwnedDocumentsSection } from '@/components/documents/OwnedDocumentsSection';

type Props = {
  projectId: string;
  canManage?: boolean;
};

export function ProjectDocumentsSection({ projectId, canManage = true }: Props) {
  return (
    <OwnedDocumentsSection
      ownerId={projectId}
      ownerLabel="project"
      queryKey="opportunity-documents"
      service={opportunityDocumentsService}
      documentTypes={OPPORTUNITY_DOCUMENT_TYPES}
      title="Project Documents"
      description="Opportunity-only files (not shown in the central Document Repository)"
      canManage={canManage}
    />
  );
}

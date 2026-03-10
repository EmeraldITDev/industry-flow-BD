import { PipelineStage } from '@/types';

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'inactive';

export const ALL_PROJECT_STATUSES: ProjectStatus[] = ['active', 'on-hold', 'completed', 'inactive'];

export const STAGE_STATUS_MAP: Record<PipelineStage, { default: ProjectStatus; allowed: ProjectStatus[] }> = {
  cold: { default: 'inactive', allowed: ['inactive'] },
  initiation: { default: 'active', allowed: ['active', 'on-hold'] },
  qualification: { default: 'active', allowed: ['active', 'on-hold'] },
  proposal: { default: 'active', allowed: ['active', 'on-hold'] },
  negotiation: { default: 'active', allowed: ['active', 'on-hold'] },
  approval: { default: 'active', allowed: ['active', 'on-hold'] },
  execution: { default: 'active', allowed: ['active', 'on-hold'] },
  closure: { default: 'completed', allowed: ['completed'] },
  lost: { default: 'inactive', allowed: ['inactive'] },
};

export function getDefaultStatusForStage(stage: PipelineStage): ProjectStatus {
  return STAGE_STATUS_MAP[stage]?.default || 'active';
}

export function getAllowedStatusesForStage(stage: PipelineStage): ProjectStatus[] {
  return STAGE_STATUS_MAP[stage]?.allowed || ALL_PROJECT_STATUSES;
}

export function isValidStageStatus(stage: PipelineStage, status: ProjectStatus): boolean {
  return getAllowedStatusesForStage(stage).includes(status);
}

export function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    active: 'Active',
    'on-hold': 'On Hold',
    completed: 'Completed',
    inactive: 'Inactive',
  };
  return labels[status] || status;
}

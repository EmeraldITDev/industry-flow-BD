import { PipelineStage } from '@/types';

/**
 * Configurable mapping from pipeline stage to progress percentage.
 * This is the single source of truth for stage-based progress calculation.
 */
export const STAGE_PROGRESS_MAP: Record<PipelineStage, number> = {
  initiation: 0,
  qualification: 20,
  proposal: 40,
  negotiation: 55,
  approval: 70,
  execution: 85,
  closure: 100,
};

/**
 * Calculate project progress based on its pipeline stage.
 * Falls back to raw progress value if stage is not recognized.
 */
export function getStageProgress(stage?: PipelineStage, rawProgress?: number): number {
  if (stage && stage in STAGE_PROGRESS_MAP) {
    return STAGE_PROGRESS_MAP[stage];
  }
  return rawProgress || 0;
}

import { PipelineStage, PIPELINE_STAGES } from '@/types';
import { stageColors } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';

interface PipelineStageSelectorProps {
  currentStage: PipelineStage;
  onStageChange?: (stage: PipelineStage) => void;
  readonly?: boolean;
  compact?: boolean;
}

export function PipelineStageSelector({ 
  currentStage, 
  onStageChange,
  readonly = false,
  compact = false 
}: PipelineStageSelectorProps) {
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.value === currentStage);

  const handleStageClick = (stage: PipelineStage) => {
    if (readonly || !onStageChange) return;
    // Don't do anything if clicking current stage
    if (stage === currentStage) return;
    // Allow direct selection of any stage
    onStageChange(stage);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {PIPELINE_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = stage.value === currentStage;
          
          return (
            <div key={stage.value} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStageClick(stage.value)}
                disabled={readonly}
                className={cn(
                  "px-2 py-1 text-xs rounded-md font-medium transition-all",
                  isCurrent && stageColors[stage.value],
                  isCompleted && "bg-primary/20 text-primary",
                  !isCurrent && !isCompleted && "bg-muted/50 text-muted-foreground",
                  !readonly && "hover:opacity-80 cursor-pointer",
                  readonly && "cursor-not-allowed opacity-60"
                )}
              >
                {isCompleted && <Check className="w-3 h-3 inline mr-1" />}
                {stage.label}
              </button>
              {index < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between overflow-x-auto pb-2 -mb-2">
        {PIPELINE_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = stage.value === currentStage;
          
          return (
            <div key={stage.value} className="flex-shrink-0 flex-1 min-w-0 flex items-center">
              <button
                type="button"
                onClick={() => handleStageClick(stage.value)}
                disabled={readonly}
                className={cn(
                  "w-full py-2 px-1.5 sm:px-3 text-[10px] sm:text-sm font-medium rounded-lg transition-all text-center",
                  isCurrent && stageColors[stage.value],
                  isCurrent && "ring-2 ring-offset-2 ring-primary",
                  isCompleted && "bg-primary/20 text-primary",
                  !isCurrent && !isCompleted && "bg-muted/30 text-muted-foreground",
                  !readonly && "hover:opacity-80 cursor-pointer",
                  readonly && "cursor-not-allowed opacity-60"
                )}
              >
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                  {isCompleted && <Check className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />}
                  <span className="hidden sm:inline truncate">{stage.label}</span>
                  <span className="sm:hidden truncate">{stage.label.slice(0, 3)}</span>
                </div>
              </button>
              {index < PIPELINE_STAGES.length - 1 && (
                <div className={cn(
                  "h-1 w-2 sm:w-4 mx-0.5 sm:mx-1 flex-shrink-0",
                  index < currentIndex ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

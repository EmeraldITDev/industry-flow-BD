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
  const handleStageClick = (stage: PipelineStage) => {
    if (readonly || !onStageChange) return;
    if (stage === currentStage) return;
    onStageChange(stage);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {PIPELINE_STAGES.map((stage, index) => {
          const isCurrent = stage.value === currentStage;
          const isLost = stage.value === 'lost';
          
          return (
            <div key={stage.value} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStageClick(stage.value)}
                disabled={readonly}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                  isCurrent && stageColors[stage.value],
                  !isCurrent && "bg-muted/50 text-muted-foreground",
                  !readonly && "hover:opacity-80 cursor-pointer",
                  readonly && "cursor-not-allowed opacity-60"
                )}
              >
                {isCurrent && <Check className="w-3 h-3 inline mr-1" />}
                {stage.label}
              </button>
              {index < PIPELINE_STAGES.length - 1 && !isLost && (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {PIPELINE_STAGES.filter(s => s.value !== 'lost').map((stage) => {
          const isCurrent = stage.value === currentStage;
          
          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => handleStageClick(stage.value)}
              disabled={readonly}
              className={cn(
                "py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all text-center",
                isCurrent && stageColors[stage.value],
                isCurrent && "ring-2 ring-offset-2 ring-primary",
                !isCurrent && "bg-muted/30 text-muted-foreground",
                !readonly && "hover:opacity-80 cursor-pointer",
                readonly && "cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center justify-center gap-0.5">
                {isCurrent && <Check className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">{stage.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Lost stage as separate button */}
      {(() => {
        const lostStage = PIPELINE_STAGES.find(s => s.value === 'lost')!;
        const isCurrent = currentStage === 'lost';
        return (
          <button
            type="button"
            onClick={() => handleStageClick('lost')}
            disabled={readonly}
            className={cn(
              "mt-1 py-2 px-3 text-xs font-medium rounded-lg transition-all text-center w-fit",
              isCurrent && stageColors['lost'],
              isCurrent && "ring-2 ring-offset-2 ring-destructive",
              !isCurrent && "bg-destructive/10 text-destructive/70",
              !readonly && "hover:opacity-80 cursor-pointer",
              readonly && "cursor-not-allowed opacity-60"
            )}
          >
            {lostStage.label}
          </button>
        );
      })()}
    </div>
  );
}

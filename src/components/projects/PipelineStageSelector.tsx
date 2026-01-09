import { useState } from 'react';
import { PipelineStage, PIPELINE_STAGES } from '@/types';
import { stageColors } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.value === currentStage);

  const handleStageClick = (stage: PipelineStage, index: number) => {
    if (readonly || !onStageChange) return;
    // Only allow clicking on current stage or next stage (sequential progression)
    if (index > currentIndex + 1) return;
    // Don't show dialog if clicking current stage
    if (stage === currentStage) return;
    
    setPendingStage(stage);
    setShowConfirmDialog(true);
  };

  const handleConfirmStageChange = () => {
    if (pendingStage && onStageChange) {
      onStageChange(pendingStage);
    }
    setShowConfirmDialog(false);
    setPendingStage(null);
  };

  const handleCancelStageChange = () => {
    setShowConfirmDialog(false);
    setPendingStage(null);
  };

  const isClickable = (index: number) => {
    // Can only click on current stage, completed stages, or the immediate next stage
    return index <= currentIndex + 1;
  };

  const getPendingStageLabel = () => {
    if (!pendingStage) return '';
    const stage = PIPELINE_STAGES.find(s => s.value === pendingStage);
    return stage?.label || '';
  };

  const getCurrentStageLabel = () => {
    const stage = PIPELINE_STAGES.find(s => s.value === currentStage);
    return stage?.label || '';
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1 flex-wrap">
          {PIPELINE_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = stage.value === currentStage;
            
            return (
              <div key={stage.value} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleStageClick(stage.value, index)}
                  disabled={readonly || !isClickable(index)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md font-medium transition-all",
                    isCurrent && stageColors[stage.value],
                    isCompleted && "bg-primary/20 text-primary",
                    !isCurrent && !isCompleted && "bg-muted/50 text-muted-foreground",
                    !readonly && isClickable(index) && "hover:opacity-80 cursor-pointer",
                    (readonly || !isClickable(index)) && "cursor-not-allowed opacity-60"
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

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Pipeline Stage?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to move from <strong>{getCurrentStageLabel()}</strong> to <strong>{getPendingStageLabel()}</strong>? This action will update the project's pipeline stage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelStageChange}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStageChange}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {PIPELINE_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = stage.value === currentStage;
            
            return (
              <div key={stage.value} className="flex-1 flex items-center">
                <button
                  type="button"
                  onClick={() => handleStageClick(stage.value, index)}
                  disabled={readonly || !isClickable(index)}
                  className={cn(
                    "w-full py-2 px-3 text-sm font-medium rounded-lg transition-all text-center",
                    isCurrent && stageColors[stage.value],
                    isCurrent && "ring-2 ring-offset-2 ring-primary",
                    isCompleted && "bg-primary/20 text-primary",
                    !isCurrent && !isCompleted && "bg-muted/30 text-muted-foreground",
                    !readonly && isClickable(index) && "hover:opacity-80 cursor-pointer",
                    (readonly || !isClickable(index)) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isCompleted && <Check className="w-4 h-4" />}
                    <span className="hidden sm:inline">{stage.label}</span>
                    <span className="sm:hidden">{stage.label.slice(0, 3)}</span>
                  </div>
                </button>
                {index < PIPELINE_STAGES.length - 1 && (
                  <div className={cn(
                    "h-1 w-4 mx-1",
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Pipeline Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move from <strong>{getCurrentStageLabel()}</strong> to <strong>{getPendingStageLabel()}</strong>? This action will update the project's pipeline stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelStageChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStageChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { MilestoneInput } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MilestoneEditorProps {
  milestones: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
}

const dateValue = (value: string): Date | undefined => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

export function MilestoneEditor({ milestones, onChange }: MilestoneEditorProps) {
  const [newMilestone, setNewMilestone] = useState<{
    title: string;
    dueDate?: Date;
  }>({ title: "" });
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const addMilestone = () => {
    const title = newMilestone.title.trim();
    if (!title || !newMilestone.dueDate) {
      toast.error("Please provide milestone title and due date");
      return;
    }

    onChange([
      ...milestones,
      {
        title,
        dueDate: format(newMilestone.dueDate, "yyyy-MM-dd"),
        completed: false,
      },
    ]);
    setNewMilestone({ title: "" });
  };

  const updateMilestone = (index: number, update: Partial<MilestoneInput>) => {
    onChange(
      milestones.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, ...update } : milestone,
      ),
    );
  };

  const confirmRemove = () => {
    if (removeIndex === null) return;
    onChange(milestones.filter((_, index) => index !== removeIndex));
    setRemoveIndex(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="new-milestone-title">Milestone Title</Label>
              <Input
                id="new-milestone-title"
                value={newMilestone.title}
                onChange={(event) =>
                  setNewMilestone((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g., Phase 1 Completion"
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[180px] justify-start text-left font-normal",
                      !newMilestone.dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newMilestone.dueDate
                      ? format(newMilestone.dueDate, "PPP")
                      : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newMilestone.dueDate}
                    onSelect={(dueDate) =>
                      setNewMilestone((current) => ({ ...current, dueDate }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button type="button" onClick={addMilestone} aria-label="Add milestone">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {milestones.length > 0 && (
            <div className="space-y-2">
              {milestones.map((milestone, index) => {
                const dueDate = dateValue(milestone.dueDate);
                return (
                  <div
                    key={milestone.id ?? `new-${index}`}
                    className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1 space-y-2 w-full">
                      <Label htmlFor={`milestone-title-${milestone.id ?? index}`}>
                        Milestone Title
                      </Label>
                      <Input
                        id={`milestone-title-${milestone.id ?? index}`}
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(index, { title: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-auto">
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full sm:w-[180px] justify-start text-left font-normal",
                              !dueDate && "text-destructive",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(selected) => {
                              if (selected) {
                                updateMilestone(index, {
                                  dueDate: format(selected, "yyyy-MM-dd"),
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemoveIndex(index)}
                      aria-label={`Remove ${milestone.title || "milestone"}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={removeIndex !== null}
        onOpenChange={(open) => !open && setRemoveIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This milestone will be removed when you save the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

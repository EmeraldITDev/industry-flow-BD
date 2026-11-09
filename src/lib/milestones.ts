import { isValid, parseISO } from "date-fns";
import type { MilestoneInput } from "@/types";

export const validateMilestones = (milestones: MilestoneInput[]): string | null => {
  for (const milestone of milestones) {
    if (!milestone.title.trim() || !isValid(parseISO(milestone.dueDate))) {
      return "Each milestone requires a title and valid due date";
    }
  }

  return null;
};

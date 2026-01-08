import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCalendar } from '@/components/calendar/ProjectCalendar';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View project deadlines and upcoming milestones
            </p>
          </div>
        </div>
        
        <ProjectCalendar />
      </div>
    </AppLayout>
  );
}

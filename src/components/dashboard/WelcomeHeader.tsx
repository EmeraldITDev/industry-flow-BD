import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Sun, Moon, CloudSun } from 'lucide-react';

export function WelcomeHeader() {
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const GIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <GIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">
            {greeting}, {user?.name?.split(' ')[0] || 'User'}
          </h1>
        </div>
        <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          {format(now, 'EEEE, MMMM d, yyyy')} — Here's your project overview
        </p>
      </div>
    </div>
  );
}

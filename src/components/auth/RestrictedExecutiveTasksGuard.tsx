import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isRestrictedExecutiveUser } from '@/lib/executive/access';

interface Props {
  children: ReactNode;
}

/** Redirects the restricted executive email away from All Tasks. */
export function RestrictedExecutiveTasksGuard({ children }: Props) {
  const { user } = useAuth();

  if (isRestrictedExecutiveUser(user)) {
    return <Navigate to="/operations" replace />;
  }

  return <>{children}</>;
}

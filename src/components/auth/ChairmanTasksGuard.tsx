import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  children: ReactNode;
}

/** Redirects Chairman users away from the All Tasks page. */
export function ChairmanTasksGuard({ children }: Props) {
  const { isChairman } = usePermissions();

  if (isChairman) {
    return <Navigate to="/operations" replace />;
  }

  return <>{children}</>;
}

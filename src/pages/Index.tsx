import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { canViewExecutive } from '@/lib/executive/access';
import Dashboard from './Dashboard';

/**
 * Operational dashboard at `/`.
 * Authorised executives are sent to the Chairman's View as their home screen.
 */
const Index = () => {
  const { user } = useAuth();

  if (canViewExecutive(user)) {
    return <Navigate to="/executive" replace />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default Index;

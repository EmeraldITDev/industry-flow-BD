import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { isRestrictedExecutiveUser } from '@/lib/executive/access';
import Dashboard from './Dashboard';

/**
 * Operational dashboard at `/`.
 * The restricted chairman email is sent to the Chairman's View as their home screen.
 */
const Index = () => {
  const { user } = useAuth();

  if (isRestrictedExecutiveUser(user)) {
    return <Navigate to="/executive" replace />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
};

export default Index;

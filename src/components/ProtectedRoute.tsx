import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'Institution' | 'Verifier';
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // You can add a loading spinner here
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    // If user is not logged in, redirect to the landing page
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const hasRole = 
      (requiredRole === 'Institution' && currentUser.isInstitution) ||
      (requiredRole === 'Verifier' && currentUser.isVerifier);

    if (!hasRole) {
      // If user does not have the required role, redirect to their dashboard or an unauthorized page
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If the user is authenticated and has the correct role (or no role is required), render the child components
  return <Outlet />;
};

export default ProtectedRoute;

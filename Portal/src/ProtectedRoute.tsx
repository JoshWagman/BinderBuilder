import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // For routes that require authentication
  if (requireAuth) {
    if (!user) {
      // Redirect to login page, saving the intended destination
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  } else {
    // For routes that should only be accessible when NOT authenticated (login/register)
    if (user) {
      // Redirect authenticated users to home page
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

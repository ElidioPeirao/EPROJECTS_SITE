
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_HIERARCHY = {
  'E-BASIC': 1,
  'E-TOOL': 2,
  'E-MASTER': 3,
  'ADMIN': 4
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!userRole || ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole])) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonBlock } from './Skeleton';

type UserRole = 'employee' | 'manager' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    if (profile.role === 'employee') {
      return <Navigate to="/employee" replace />;
    } else if (profile.role === 'manager') {
      return <Navigate to="/manager" replace />;
    } else if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};

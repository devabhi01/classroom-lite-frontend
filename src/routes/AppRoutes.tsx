import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';

// Pages
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { CreateClassroom } from '@/pages/CreateClassroom';
import { JoinClassroom } from '@/pages/JoinClassroom';
import { Classroom } from '@/pages/Classroom';
import { Profile } from '@/pages/Profile';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { Analytics } from '@/pages/Analytics';
import { RecentClassrooms } from '@/pages/RecentClassrooms';
import { InstitutionManagement } from '@/pages/InstitutionManagement';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  if (user && user.isEmailVerified === false) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }

  return <>{children}</>;
};

// Teacher Only Route Guard (Students cannot create classrooms)
const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.isEmailVerified === false) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email)}`} replace />;
  }
  if (user?.role === 'STUDENT') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Public Only Route Guard (for login/signup)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user?.isEmailVerified !== false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// 404 Fallback
const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-extrabold text-foreground mb-2">404</h1>
      <p className="text-sm text-muted-foreground mb-6">Page not found</p>
      <Link to="/">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Layout>
              <Login />
            </Layout>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <Layout>
              <Signup />
            </Layout>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <Layout>
            <VerifyEmail />
          </Layout>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-classroom"
        element={
          <TeacherRoute>
            <Layout>
              <CreateClassroom />
            </Layout>
          </TeacherRoute>
        }
      />
      <Route
        path="/join-classroom"
        element={
          <ProtectedRoute>
            <Layout>
              <JoinClassroom />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions"
        element={
          <ProtectedRoute>
            <Layout>
              <InstitutionManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <InstitutionManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recent-classrooms"
        element={
          <ProtectedRoute>
            <Layout>
              <RecentClassrooms />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Dedicated Fullscreen Classroom Screen */}
      <Route
        path="/classroom/:code"
        element={
          <ProtectedRoute>
            <Classroom />
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFound />
          </Layout>
        }
      />
    </Routes>
  );
};

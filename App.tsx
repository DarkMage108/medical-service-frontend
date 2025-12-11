import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider, usePermissions } from './contexts/PermissionsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import TreatmentDetail from './pages/TreatmentDetail';
import DiagnosisList from './pages/DiagnosisList';
import MedicationList from './pages/MedicationList';
import HistoryList from './pages/HistoryList';
import InventoryList from './pages/InventoryList';
import PermissionsManager from './pages/PermissionsManager';
import Checklist from './pages/Checklist';
import NursingList from './pages/NursingList';
import { Loader2 } from 'lucide-react';
import { UserRole } from './types';

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 size={48} className="animate-spin text-pink-500 mx-auto mb-4" />
      <p className="text-slate-600">Carregando...</p>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Protected route with permission check
const ProtectedRouteWithPermission: React.FC<{
  children: React.ReactNode;
  menuKey: string;
}> = ({ children, menuKey }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasAccess, isLoading: permissionsLoading } = usePermissions();

  if (isLoading || permissionsLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess(menuKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Main app content (uses auth context)
const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleLogout = () => {
    if (window.confirm('Deseja sair do sistema?')) {
      logout();
    }
  };

  // Convert auth user to the User type expected by Layout
  const layoutUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: true,
  } : null;

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Protected routes with permission checks */}
      <Route
        path="/"
        element={
          <ProtectedRouteWithPermission menuKey="dashboard">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <Dashboard />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/pacientes"
        element={
          <ProtectedRouteWithPermission menuKey="patients">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <PatientList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/pacientes/:id"
        element={
          <ProtectedRouteWithPermission menuKey="patients">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <PatientDetail />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/tratamento/:id"
        element={
          <ProtectedRouteWithPermission menuKey="patients">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <TreatmentDetail />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/diagnosticos"
        element={
          <ProtectedRouteWithPermission menuKey="diagnoses">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <DiagnosisList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/protocolos"
        element={
          <ProtectedRouteWithPermission menuKey="protocols">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <MedicationList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/historico"
        element={
          <ProtectedRouteWithPermission menuKey="history">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <HistoryList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/estoque"
        element={
          <ProtectedRouteWithPermission menuKey="inventory">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <InventoryList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/checklist"
        element={
          <ProtectedRouteWithPermission menuKey="checklist">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <Checklist />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/enfermagem"
        element={
          <ProtectedRouteWithPermission menuKey="nursing">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <NursingList />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/permissoes"
        element={
          <ProtectedRoute>
            {layoutUser?.role === UserRole.ADMIN ? (
              <Layout user={layoutUser!} onLogout={handleLogout}>
                <PermissionsManager />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <PermissionsProvider>
          <AppContent />
        </PermissionsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

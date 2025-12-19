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
import CashRegister from './pages/CashRegister';
import PermissionsManager from './pages/PermissionsManager';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
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

// Menu key to path mapping for redirects
const MENU_TO_PATH: Record<string, string> = {
  dashboard: '/',
  checklist: '/checklist',
  nursing: '/enfermagem',
  patients: '/pacientes',
  history: '/historico',
  inventory: '/estoque',
  cashregister: '/caixa',
  diagnoses: '/diagnosticos',
  protocols: '/protocolos',
};

// Order of fallback routes
const MENU_ORDER = ['dashboard', 'checklist', 'nursing', 'patients', 'history', 'inventory', 'cashregister', 'diagnoses', 'protocols'];

// Default redirect component - redirects to first accessible route
const DefaultRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  if (isLoading || permissionsLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Find first accessible route
  const firstAccessible = MENU_ORDER.find(key => permissions[key]);
  const redirectTo = firstAccessible ? MENU_TO_PATH[firstAccessible] : '/login';
  return <Navigate to={redirectTo} replace />;
};

// Protected route with permission check
const ProtectedRouteWithPermission: React.FC<{
  children: React.ReactNode;
  menuKey: string;
}> = ({ children, menuKey }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasAccess, permissions, isLoading: permissionsLoading } = usePermissions();

  if (isLoading || permissionsLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess(menuKey)) {
    // Find first accessible route
    const firstAccessible = MENU_ORDER.find(key => permissions[key]);
    const redirectTo = firstAccessible ? MENU_TO_PATH[firstAccessible] : '/login';
    return <Navigate to={redirectTo} replace />;
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
        path="/caixa"
        element={
          <ProtectedRouteWithPermission menuKey="cashregister">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <CashRegister />
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
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            {layoutUser?.role === UserRole.ADMIN ? (
              <Layout user={layoutUser!} onLogout={handleLogout}>
                <UserManagement />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to first accessible route */}
      <Route path="*" element={<DefaultRedirect />} />
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

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider, usePermissions } from './contexts/PermissionsContext';
import Layout from './components/Layout';
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PatientList = React.lazy(() => import('./pages/PatientList'));
const PatientDetail = React.lazy(() => import('./pages/PatientDetail'));
const TreatmentDetail = React.lazy(() => import('./pages/TreatmentDetail'));
const DiagnosisList = React.lazy(() => import('./pages/DiagnosisList'));
const MedicationList = React.lazy(() => import('./pages/MedicationList'));
const HistoryList = React.lazy(() => import('./pages/HistoryList'));
const InventoryList = React.lazy(() => import('./pages/InventoryList'));
const CashRegister = React.lazy(() => import('./pages/CashRegister'));
const PermissionsManager = React.lazy(() => import('./pages/PermissionsManager'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NursingList = React.lazy(() => import('./pages/NursingList'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const MessageTemplates = React.lazy(() => import('./pages/MessageTemplates'));
const ConsentTermsPage = React.lazy(() => import('./pages/ConsentTermsPage'));
const DosesPage = React.lazy(() => import('./pages/DosesPage'));
const ConsultationsPage = React.lazy(() => import('./pages/ConsultationsPage'));
const SurveyPage = React.lazy(() => import('./pages/SurveyPage'));
const PublicSurveyPage = React.lazy(() => import('./pages/PublicSurveyPage'));
const QADashboard = React.lazy(() => import('./pages/QADashboard'));
const CuradoriaPage = React.lazy(() => import('./pages/CuradoriaPage'));
const TeleconsultaPage = React.lazy(() => import('./pages/TeleconsultaPage'));
const ExameUploadsPage = React.lazy(() => import('./pages/ExameUploadsPage'));
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
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
  nursing: '/enfermagem',
  patients: '/pacientes',
  history: '/historico',
  inventory: '/estoque',
  cashregister: '/caixa',
  diagnoses: '/diagnosticos',
  protocols: '/protocolos',
  // March 2026 — secondary pages (permission-controlled)
  'consent-terms': '/termos-consentimento',
  'doses-page': '/doses',
  consultations: '/consultas',
  survey: '/pesquisa-enfermagem',
  'message-templates': '/modelos-mensagem',
};

// Order of fallback routes
const MENU_ORDER = [
  'dashboard', 'nursing', 'patients', 'history',
  'inventory', 'cashregister', 'diagnoses', 'protocols',
  'consent-terms', 'doses-page', 'consultations', 'survey', 'message-templates',
];

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
    <React.Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Public survey page (no auth required) */}
      <Route path="/pesquisa" element={<PublicSurveyPage />} />

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
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            {layoutUser?.role === UserRole.ADMIN ? (
              <Layout user={layoutUser!} onLogout={handleLogout}>
                <SettingsPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        }
      />
      {/* March 2026 — sidebar pages extracted from main dashboard, permission-controlled */}
      <Route
        path="/termos-consentimento"
        element={
          <ProtectedRouteWithPermission menuKey="consent-terms">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <ConsentTermsPage />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/doses"
        element={
          <ProtectedRouteWithPermission menuKey="doses-page">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <DosesPage />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/consultas"
        element={
          <ProtectedRouteWithPermission menuKey="consultations">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <ConsultationsPage />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/pesquisa-enfermagem"
        element={
          <ProtectedRouteWithPermission menuKey="survey">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <SurveyPage />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />
      <Route
        path="/modelos-mensagem"
        element={
          <ProtectedRouteWithPermission menuKey="message-templates">
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <MessageTemplates />
            </Layout>
          </ProtectedRouteWithPermission>
        }
      />


      <Route
        path="/assistente-ia"
        element={
          <ProtectedRoute>
            <ProtectedRouteWithPermission menuKey="qa-dashboard">
              <Layout user={layoutUser!} onLogout={handleLogout}>
                <QADashboard />
              </Layout>
            </ProtectedRouteWithPermission>
          </ProtectedRoute>
        }
      />

      <Route
        path="/curadoria"
        element={
          <ProtectedRoute>
            <ProtectedRouteWithPermission menuKey="curadoria">
              <Layout user={layoutUser!} onLogout={handleLogout}>
                <CuradoriaPage />
              </Layout>
            </ProtectedRouteWithPermission>
          </ProtectedRoute>
        }
      />


      <Route
        path="/teleconsulta"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <TeleconsultaPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/exames-enviados"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <ExameUploadsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to first accessible route */}
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
    </React.Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <PermissionsProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </PermissionsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

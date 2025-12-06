import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { Loader2 } from 'lucide-react';

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

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <PatientList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/:id"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <PatientDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tratamento/:id"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <TreatmentDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/diagnosticos"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <DiagnosisList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/protocolos"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <MedicationList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/historico"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <HistoryList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque"
        element={
          <ProtectedRoute>
            <Layout user={layoutUser!} onLogout={handleLogout}>
              <InventoryList />
            </Layout>
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
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;

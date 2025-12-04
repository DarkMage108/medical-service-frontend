import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import TreatmentDetail from './pages/TreatmentDetail';
import DiagnosisList from './pages/DiagnosisList';
import MedicationList from './pages/MedicationList';
import HistoryList from './pages/HistoryList';
import InventoryList from './pages/InventoryList';
import { User, UserRole } from './types';

const App: React.FC = () => {
  // Debug de montagem
  useEffect(() => {
    console.log('App Azevedo Iniciado - Versão Sem Login');
  }, []);

  // Usuário Admin Padrão (Hardcoded para acesso direto)
  const DEFAULT_USER: User = {
    id: 'u_admin_auto',
    name: 'Administrador',
    email: 'admin@azevedo.com',
    role: UserRole.ADMIN,
    active: true
  };

  const handleLogout = () => {
    // Como não existe mais tela de login, o logout serve apenas para recarregar a aplicação
    if (window.confirm('Deseja recarregar o sistema?')) {
        window.location.reload();
    }
  };

  return (
    <Router>
      <Layout user={DEFAULT_USER} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<PatientList />} />
          <Route path="/pacientes/:id" element={<PatientDetail />} />
          <Route path="/tratamento/:id" element={<TreatmentDetail />} />
          <Route path="/diagnosticos" element={<DiagnosisList />} />
          <Route path="/protocolos" element={<MedicationList />} />
          <Route path="/historico" element={<HistoryList />} />
          <Route path="/estoque" element={<InventoryList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
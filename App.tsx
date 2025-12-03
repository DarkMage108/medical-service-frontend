
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import TreatmentDetail from './pages/TreatmentDetail';
import DiagnosisList from './pages/DiagnosisList';
import MedicationList from './pages/MedicationList';
import { User } from './types';
import { MOCK_USERS } from './services/mockData';
import { SESSION_KEY } from './constants';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    
    if (storedSession) {
        try {
            const user = JSON.parse(storedSession);
            
            // Verificação básica de integridade do objeto antes de buscar no mock
            if (user && user.id) {
                // Valida se o usuário ainda existe e está ativo no sistema
                // Isso previne que usuários excluídos do mockData mantenham acesso via localStorage
                const isValidUser = MOCK_USERS.find(u => u.id === user.id && u.active);
                
                if (isValidUser) {
                    // Atualiza com dados mais recentes (ex: role pode ter mudado)
                    const refreshedUser: User = {
                        id: isValidUser.id,
                        name: isValidUser.name,
                        email: isValidUser.email,
                        role: isValidUser.role,
                        active: isValidUser.active
                    };
                    setCurrentUser(refreshedUser);
                } else {
                    // Sessão inválida ou usuário desativado
                    localStorage.removeItem(SESSION_KEY);
                }
            } else {
                localStorage.removeItem(SESSION_KEY);
            }
        } catch (e) {
            console.error("Failed to parse session", e);
            localStorage.removeItem(SESSION_KEY);
        }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    // Não é necessário window.location.href = '/', o React re-renderiza o componente e cai no if(!currentUser)
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
            <p className="font-medium animate-pulse">Carregando sistema...</p>
        </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<PatientList />} />
          <Route path="/pacientes/:id" element={<PatientDetail />} />
          <Route path="/tratamento/:id" element={<TreatmentDetail />} />
          <Route path="/diagnosticos" element={<DiagnosisList />} />
          <Route path="/protocolos" element={<MedicationList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;

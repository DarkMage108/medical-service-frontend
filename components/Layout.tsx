

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, HeartPulse, Stethoscope, ClipboardList, UserCircle, History, Package } from 'lucide-react';
import { User, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

// Configuração do Menu extraída para fora do componente (Melhoria de Performance)
const NAV_ITEMS = [
  { 
      label: 'Dashboard', 
      path: '/', 
      icon: LayoutDashboard,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY]
  },
  { 
      label: 'Pacientes', 
      path: '/pacientes', 
      icon: Users,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY]
  },
  { 
      label: 'Histórico', 
      path: '/historico', 
      icon: History,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY]
  },
  { 
      label: 'Estoque', 
      path: '/estoque', 
      icon: Package,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR] // Acesso restrito
  },
  { 
      label: 'Diagnósticos', 
      path: '/diagnosticos', 
      icon: Stethoscope,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
  { 
      label: 'Protocolos', 
      path: '/protocolos', 
      icon: ClipboardList,
      allowedRoles: [UserRole.ADMIN, UserRole.DOCTOR]
  },
];

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  // Filtra itens baseados no role do usuário logado
  const navItems = NAV_ITEMS.filter(item => item.allowedRoles.includes(user.role));

  const isActive = (path: string) => {
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <HeartPulse className="text-pink-600 mr-2 flex-shrink-0" size={28} />
          <span className="font-bold text-slate-800 text-sm leading-tight">Azevedo Serviços Médicos</span>
        </div>
        
        {/* User Profile Mini Card */}
        <div className="px-4 py-4 border-b border-slate-50">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                <div className="bg-pink-100 text-pink-600 rounded-full p-2">
                    <UserCircle size={20} />
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{ROLE_LABELS[user.role] || 'Usuário'}</p>
                </div>
            </div>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1" aria-label="Navegação Principal">
          {navItems.map((item) => {
             const Icon = item.icon;
             return (
                <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                    ? 'bg-pink-50 text-pink-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                >
                <Icon size={20} className="mr-3" />
                {item.label}
                </Link>
             );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
             onClick={onLogout}
             aria-label="Sair do Sistema"
             className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex flex-col sticky top-0 z-20 gap-3">
         <div className="flex items-center justify-between">
             <div className="flex items-center">
                <HeartPulse className="text-pink-600 mr-2" size={24} />
                <span className="font-bold text-slate-800 text-sm">Azevedo Serviços Médicos</span>
             </div>
             <button onClick={onLogout} className="text-slate-400">
                <LogOut size={20} />
             </button>
         </div>
         <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
             {navItems.map(item => {
                const Icon = item.icon;
                return (
                    <Link key={item.path} to={item.path} className={`p-2 whitespace-nowrap text-sm flex items-center rounded-md ${isActive(item.path) ? 'bg-pink-50 text-pink-700' : 'text-slate-600'}`}>
                        <Icon size={18} className="mr-2" />
                        {item.label}
                    </Link>
                );
             })}
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-[calc(100dvh-80px)] md:min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;


import React, { useState } from 'react';
import { HeartPulse, Lock, Mail, Info } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../services/mockData';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verifica se o email e senha existem na lista de usuários permitidos
    const validUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password
    );

    if (validUser) {
      // Cria objeto de sessão seguro (sem senha)
      const sessionUser: User = {
          id: validUser.id,
          name: validUser.name,
          email: validUser.email,
          role: validUser.role,
          active: true
      };
      onLogin(sessionUser);
    } else {
      setError('Credenciais inválidas. Verifique seu email e senha.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <HeartPulse className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Azevedo Serviços Médicos</h1>
          <p className="text-pink-100">Acesso Restrito à Equipe Clínica</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  placeholder="seu.nome@azevedo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
            >
              Entrar no Sistema
            </button>
          </form>

          {/* Dica para o MVP - Remover em produção */}
          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-start p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                <div>
                   <span className="font-bold block mb-1">Acessos de Teste (MVP):</span>
                   <div className="grid grid-cols-1 gap-2 mt-2">
                       {MOCK_USERS.map(u => (
                           <button 
                                key={u.id}
                                onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                                className="text-left bg-white border border-blue-200 hover:bg-blue-100 p-2 rounded shadow-sm transition-colors"
                           >
                               <span className="font-bold">{u.name}</span> <span className="text-blue-500">({u.role})</span>
                           </button>
                       ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            &copy; 2024 Azevedo Serviços Médicos. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

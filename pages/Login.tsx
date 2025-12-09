import React, { useState } from 'react';
import { HeartPulse, Lock, Mail, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_USERS = [
  { email: 'admin@azevedo.com', password: 'admin123', name: 'Administrador', role: 'ADMIN' },
  { email: 'medico@azevedo.com', password: 'doctor123', name: 'Dr. Silva', role: 'DOCTOR' },
  { email: 'secretaria@azevedo.com', password: 'secretary123', name: 'Maria SecretÃ¡ria', role: 'SECRETARY' },
];

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error: authError, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLocalError('');
  clearError();
  setIsSubmitting(true);

  try {
    await login(email, password);
  } catch (err: any) {
    setLocalError(err.message || 'Credenciais invÃ¡lidas. Verifique seu email e senha.');
  } finally {
    setIsSubmitting(false);
  }
  };

  const error = localError || authError;

  return (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
    <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-8 text-center">
      <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
      <HeartPulse className="text-white" size={32} />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Azevedo ServiÃ§os MÃ©dicos</h1>
      <p className="text-pink-100">Acesso Restrito Ã  Equipe ClÃ­nica</p>
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
          disabled={isSubmitting}
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
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          required
          disabled={isSubmitting}
        />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-100">
        {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Entrando...
        </>
        ) : (
        'Entrar no Sistema'
        )}
      </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100">
      <div className="flex items-start p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
        <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
        <div>
        <span className="font-bold block mb-1">Acessos de Teste:</span>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => {
            setEmail(u.email);
            setPassword(u.password);
            setLocalError('');
            clearError();
            }}
            disabled={isSubmitting}
            className="text-left bg-white border border-blue-200 hover:bg-blue-100 p-2 rounded shadow-sm transition-colors disabled:opacity-50"
          >
            <span className="font-bold">{u.name}</span>{' '}
            <span className="text-blue-500">({u.role})</span>
          </button>
          ))}
        </div>
        </div>
      </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
      &copy; 2024 Azevedo ServiÃ§os MÃ©dicos. Todos os direitos reservados.
      </div>
    </div>
    </div>
  </div>
  );
};

export default Login;

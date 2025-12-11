import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Shield, Save, Lock, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { ROLE_LABELS } from '../constants';
import { UserRole } from '../types';

const Profile: React.FC = () => {
  const { user } = useAuth();

  // Profile edit states
  const [name, setName] = useState(user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (profileSuccess) {
      const timer = setTimeout(() => setProfileSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileSuccess]);

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      await authApi.updateProfile({ name: name.trim() });
      setProfileSuccess('Perfil atualizado com sucesso!');
      // Note: To reflect changes in header, user would need to refresh or we'd need to update AuthContext
    } catch (err: any) {
      setProfileError(err.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas nao coincidem');
      return;
    }

    setIsSavingPassword(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao alterar senha');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'doctor': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'secretary': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'nurse': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <UserIcon size={28} className="mr-3 text-pink-600" />
          Meu Perfil
        </h1>
        <p className="text-slate-500 mt-1">
          Gerencie suas informacoes pessoais e senha.
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 flex items-center">
            <UserIcon size={18} className="mr-2 text-pink-600" />
            Informacoes Pessoais
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          {profileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-sm">
              <AlertCircle size={16} className="text-red-600 mr-2 flex-shrink-0" />
              <span className="text-red-700">{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center text-sm">
              <Check size={16} className="text-green-600 mr-2 flex-shrink-0" />
              <span className="text-green-700">{profileSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (nao pode ser alterado)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-slate-400" />
              </div>
              <input
                type="email"
                disabled
                value={user.email}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Shield size={16} className="text-slate-400" />
              </div>
              <div className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-lg">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleColor(user.role)}`}>
                  {ROLE_LABELS[user.role as UserRole] || user.role}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">O perfil so pode ser alterado por um administrador.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile || name === user.name}
              className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingProfile ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              Salvar Alteracoes
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 flex items-center">
            <Lock size={18} className="mr-2 text-pink-600" />
            Alterar Senha
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-sm">
              <AlertCircle size={16} className="text-red-600 mr-2 flex-shrink-0" />
              <span className="text-red-700">{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center text-sm">
              <Check size={16} className="text-green-600 mr-2 flex-shrink-0" />
              <span className="text-green-700">{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-400" />
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-400" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Repita a nova senha"
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">As senhas nao coincidem</p>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingPassword ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Lock size={18} className="mr-2" />
              )}
              Alterar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;

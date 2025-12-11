import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, AlertCircle, Check, Edit2, UserX, UserCheck, Mail, Lock, User as UserIcon } from 'lucide-react';
import { usersApi, authApi } from '../services/api';
import { User, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';
import Modal from '../components/ui/Modal';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DOCTOR', label: 'Medico' },
  { value: 'SECRETARY', label: 'Secretaria' },
  { value: 'NURSE', label: 'Enfermeira' },
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('SECRETARY');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await usersApi.getAll();
      setUsers(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formPassword || !formName) return;

    setIsSaving(true);
    setError(null);

    try {
      const newUser = await authApi.register({
        email: formEmail,
        password: formPassword,
        name: formName,
        role: formRole,
      });
      setUsers(prev => [newUser, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
      setSuccessMessage('Usuario criado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSaving(true);
    setError(null);

    try {
      const updates: any = {
        name: formName,
        role: formRole,
      };

      if (formPassword) {
        updates.password = formPassword;
      }

      const updated = await usersApi.update(editingUser.id, updates);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
      setIsEditModalOpen(false);
      setEditingUser(null);
      resetForm();
      setSuccessMessage('Usuario atualizado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const action = user.active ? 'desativar' : 'ativar';
    if (!window.confirm(`Deseja ${action} o usuario "${user.name}"?`)) return;

    try {
      await usersApi.update(user.id, { active: !user.active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
      setSuccessMessage(`Usuario ${user.active ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role.toUpperCase());
    setFormPassword('');
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormEmail('');
    setFormPassword('');
    setFormName('');
    setFormRole('SECRETARY');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
        <span className="ml-3 text-slate-600">Carregando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Users size={28} className="mr-3 text-pink-600" />
            Gerenciamento de Usuarios
          </h1>
          <p className="text-slate-500 mt-1">
            Adicione, edite e gerencie usuarios do sistema.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Novo Usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <Check size={20} className="text-green-600 mr-3 flex-shrink-0" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Perfil</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  Nenhum usuario cadastrado.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                        <UserIcon size={18} className="text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleColor(user.role)}`}>
                      {ROLE_LABELS[user.role as UserRole] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.active ? (
                      <span className="inline-flex items-center text-green-600 text-xs font-medium">
                        <Check size={14} className="mr-1" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-400 text-xs font-medium">
                        <UserX size={14} className="mr-1" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-2 rounded-lg transition-colors ${user.active
                          ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.active ? 'Desativar' : 'Ativar'}
                      >
                        {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Novo Usuario"
        icon={<Plus size={20} className="text-pink-600" />}
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Nome do usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
            <select
              value={formRole}
              onChange={e => setFormRole(e.target.value)}
              className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Plus size={18} className="mr-2" />}
              Criar Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingUser(null); }}
        title="Editar Usuario"
        icon={<Edit2 size={20} className="text-pink-600" />}
      >
        {editingUser && (
          <form onSubmit={handleEditUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
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
                  value={formEmail}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha (deixe vazio para manter)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Nova senha (opcional)"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
              <select
                value={formRole}
                onChange={e => setFormRole(e.target.value)}
                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Check size={18} className="mr-2" />}
                Salvar Alteracoes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;

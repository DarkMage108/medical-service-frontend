import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, Check, RotateCcw, Save, Lock } from 'lucide-react';
import { permissionsApi, MenuItem } from '../services/api';
import { UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface RolePermissions {
  [menuKey: string]: boolean;
}

interface AllPermissions {
  [role: string]: RolePermissions;
}

const PermissionsManager: React.FC = () => {
  const [permissions, setPermissions] = useState<AllPermissions>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await permissionsApi.getAll();
      setPermissions(response.data);
      setMenuItems(response.menuItems);
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar permissoes');
      console.error('Failed to load permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (role: string, menuKey: string, value: boolean) => {
    // Admin permissions are locked - always full access
    if (role === 'ADMIN') return;

    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menuKey]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Save permissions for DOCTOR, SECRETARY and NURSE only (ADMIN is locked)
      const rolesToSave = ['DOCTOR', 'SECRETARY', 'NURSE'];

      await Promise.all(
        rolesToSave.map(role =>
          permissionsApi.updateRolePermissions(role, permissions[role])
        )
      );

      setSuccessMessage('Permissoes atualizadas com sucesso!');
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar permissoes');
      console.error('Failed to save permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Deseja restaurar as permissoes padrao para todos os perfis?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Reset permissions for DOCTOR, SECRETARY and NURSE only
      const rolesToReset = ['DOCTOR', 'SECRETARY', 'NURSE'];

      const responses = await Promise.all(
        rolesToReset.map(role => permissionsApi.resetRolePermissions(role))
      );

      // Update local state with reset values
      const newPermissions = { ...permissions };
      rolesToReset.forEach((role, index) => {
        newPermissions[role] = responses[index].data;
      });
      setPermissions(newPermissions);

      setSuccessMessage('Permissoes restauradas para o padrao!');
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao restaurar permissoes');
      console.error('Failed to reset permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
        <span className="ml-3 text-slate-600">Carregando permissoes...</span>
      </div>
    );
  }

  // Order roles: ADMIN first (locked), then DOCTOR, SECRETARY, NURSE
  const roles = ['ADMIN', 'DOCTOR', 'SECRETARY', 'NURSE'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Shield size={28} className="mr-3 text-pink-600" />
          Gerenciamento de Permissoes
        </h1>
        <p className="text-slate-500 mt-1">
          Configure quais menus cada perfil de usuario pode acessar no sistema.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <Check size={20} className="text-green-600 mr-3 flex-shrink-0" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Menu
                </th>
                {roles.map(role => (
                  <th
                    key={role}
                    className="px-6 py-4 text-center text-sm font-bold text-slate-600 uppercase tracking-wider"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {ROLE_LABELS[role.toLowerCase() as UserRole] || role}
                      {role === 'ADMIN' && (
                        <Lock size={14} className="text-slate-400" title="Permissoes bloqueadas" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menuItems.map(item => (
                <tr key={item.key} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="font-medium text-slate-800">{item.label}</span>
                      <span className="ml-2 text-xs text-slate-400">{item.path}</span>
                    </div>
                  </td>
                  {roles.map(role => {
                    const isAdmin = role === 'ADMIN';
                    const isChecked = permissions[role]?.[item.key] ?? false;

                    return (
                      <td key={`${item.key}-${role}`} className="px-6 py-4 text-center">
                        <label className={`inline-flex items-center ${isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={isAdmin ? true : isChecked}
                            onChange={e => handlePermissionChange(role, item.key, e.target.checked)}
                            disabled={isSaving || isAdmin}
                            className="sr-only peer"
                          />
                          <div className={`relative w-11 h-6 ${isAdmin ? 'bg-green-500' : 'bg-slate-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600 peer-disabled:opacity-50 ${isAdmin ? '!bg-green-500 !opacity-100' : ''}`}></div>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Single action buttons row */}
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-500">
              <Lock size={14} className="mr-2" />
              Administrador tem acesso total e nao pode ser editado.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetAll}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw size={16} className="mr-2" />
                Restaurar Padrao
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving || !hasChanges}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                Salvar Alteracoes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-2">Informacoes</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>As alteracoes de permissao entram em vigor imediatamente apos salvar.</li>
          <li>Os usuarios precisarao recarregar a pagina para ver as alteracoes.</li>
          <li>O perfil Administrador possui acesso total e nao pode ser modificado.</li>
        </ul>
      </div>
    </div>
  );
};

export default PermissionsManager;

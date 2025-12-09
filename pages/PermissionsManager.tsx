import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, Check, RotateCcw, Save } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

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
    setHasChanges({});
  } catch (err: any) {
    setError(err.message || 'Erro ao carregar permissÃµes');
    console.error('Failed to load permissions:', err);
  } finally {
    setIsLoading(false);
  }
  };

  const handlePermissionChange = (role: string, menuKey: string, value: boolean) => {
  setPermissions(prev => ({
    ...prev,
    [role]: {
    ...prev[role],
    [menuKey]: value,
    },
  }));
  setHasChanges(prev => ({ ...prev, [role]: true }));
  };

  const handleSaveRole = async (role: string) => {
  try {
    setIsSaving(role);
    setError(null);
    await permissionsApi.updateRolePermissions(role, permissions[role]);
    setSuccessMessage(`PermissÃµes do perfil ${ROLE_LABELS[role as UserRole] || role} atualizadas com sucesso!`);
    setHasChanges(prev => ({ ...prev, [role]: false }));
  } catch (err: any) {
    setError(err.message || 'Erro ao salvar permissÃµes');
    console.error('Failed to save permissions:', err);
  } finally {
    setIsSaving(null);
  }
  };

  const handleResetRole = async (role: string) => {
  if (!window.confirm(`Deseja restaurar as permissÃµes padrÃ£o para o perfil ${ROLE_LABELS[role as UserRole] || role}?`)) {
    return;
  }

  try {
    setIsSaving(role);
    setError(null);
    const response = await permissionsApi.resetRolePermissions(role);
    setPermissions(prev => ({
    ...prev,
    [role]: response.data,
    }));
    setSuccessMessage(`PermissÃµes do perfil ${ROLE_LABELS[role as UserRole] || role} restauradas para o padrÃ£o!`);
    setHasChanges(prev => ({ ...prev, [role]: false }));
  } catch (err: any) {
    setError(err.message || 'Erro ao restaurar permissÃµes');
    console.error('Failed to reset permissions:', err);
  } finally {
    setIsSaving(null);
  }
  };

  if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
    <Loader2 size={32} className="animate-spin text-pink-600" />
    <span className="ml-3 text-slate-600">Carregando permissÃµes...</span>
    </div>
  );
  }

  const roles = Object.values(UserRole).map(r => r.toUpperCase());

  return (
  <div className="space-y-6 max-w-6xl mx-auto">
    <div>
    <h1 className="text-2xl font-bold text-slate-800 flex items-center">
      <Shield size={28} className="mr-3 text-pink-600" />
      Gerenciamento de PermissÃµes
    </h1>
    <p className="text-slate-500 mt-1">
      Configure quais menus cada perfil de usuÃ¡rio pode acessar no sistema.
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
          {ROLE_LABELS[role.toLowerCase() as UserRole] || role}
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
          {roles.map(role => (
          <td key={`${item.key}-${role}`} className="px-6 py-4 text-center">
            <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={permissions[role]?.[item.key] ?? false}
              onChange={e => handlePermissionChange(role, item.key, e.target.checked)}
              disabled={isSaving === role}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600 peer-disabled:opacity-50"></div>
            </label>
          </td>
          ))}
        </tr>
        ))}
      </tbody>
      </table>
    </div>

    {/* Action buttons per role */}
    <div className="border-t border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-4 justify-end">
      {roles.map(role => (
        <div key={role} className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">
          {ROLE_LABELS[role.toLowerCase() as UserRole] || role}:
        </span>
        <button
          onClick={() => handleResetRole(role)}
          disabled={isSaving !== null}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw size={14} className="mr-1.5" />
          Restaurar
        </button>
        <button
          onClick={() => handleSaveRole(role)}
          disabled={isSaving !== null || !hasChanges[role]}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-pink-600 border border-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving === role ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
          <Save size={14} className="mr-1.5" />
          )}
          Salvar
        </button>
        </div>
      ))}
      </div>
    </div>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 className="text-sm font-bold text-blue-800 mb-2">InformaÃ§Ãµes</h3>
    <ul className="text-sm text-blue-700 space-y-1">
      <li>As alteraÃ§Ãµes de permissÃ£o entram em vigor imediatamente apÃ³s salvar.</li>
      <li>Os usuÃ¡rios precisarÃ£o recarregar a pÃ¡gina para ver as alteraÃ§Ãµes.</li>
      <li>O menu Dashboard normalmente deve permanecer acessÃ­vel para todos os perfis.</li>
    </ul>
    </div>
  </div>
  );
};

export default PermissionsManager;

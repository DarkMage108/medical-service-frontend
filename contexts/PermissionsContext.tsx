import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { permissionsApi, MenuItem } from '../services/api';
import { useAuth } from './AuthContext';

interface PermissionsContextType {
  permissions: Record<string, boolean>;
  menuItems: MenuItem[];
  isLoading: boolean;
  hasAccess: (menuKey: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions({});
      setMenuItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await permissionsApi.getMyPermissions();
      setPermissions(response.permissions);
      setMenuItems(response.data);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      // Set default permissions on error
      setPermissions({
        dashboard: true,
        patients: true,
        history: true,
        inventory: false,
        diagnoses: false,
        protocols: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load permissions when user changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions, user]);

  const hasAccess = useCallback((menuKey: string): boolean => {
    return permissions[menuKey] ?? false;
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  const value: PermissionsContextType = {
    permissions,
    menuItems,
    isLoading,
    hasAccess,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export default PermissionsContext;

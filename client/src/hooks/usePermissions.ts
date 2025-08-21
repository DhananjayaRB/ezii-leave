import { useState, useEffect } from 'react';

// Global cache for permissions to prevent flickering
let permissionsCache: PermissionStructure | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds - shorter cache to pick up permission changes faster

interface PermissionStructure {
  // Employee Screens
  employeeOverview: { view: boolean; modify: boolean };
  leaveApplications: { view: boolean; modify: boolean };
  holidays: { view: boolean; modify: boolean };
  compensatoryOff: { view: boolean; modify: boolean };
  bto: { view: boolean; modify: boolean };
  employeeReports: { view: boolean; modify: boolean };
  
  // Admin Screens
  adminOverview: { view: boolean; modify: boolean };
  approvals: { view: boolean; modify: boolean };
  employees: { view: boolean; modify: boolean };
  workflows: { view: boolean; modify: boolean };
  roles: { view: boolean; modify: boolean };
  adminReports: { view: boolean; modify: boolean };
  importLeaveData: { view: boolean; modify: boolean };
  
  // Admin Configuration Screens
  adminLeaveTypes: { view: boolean; modify: boolean };
  adminCompOff: { view: boolean; modify: boolean };
  adminBTO: { view: boolean; modify: boolean };
  adminSettings: { view: boolean; modify: boolean };
  
  // Allow On Behalf Actions
  allowOnBehalf: { bto: boolean; leave: boolean; compOff: boolean };
}

// Default permissions based on role
const getDefaultPermissions = (role: string): PermissionStructure => {
  switch (role) {
    case 'admin':
      return {
        // Employee Screens
        employeeOverview: { view: true, modify: true },
        leaveApplications: { view: true, modify: true },
        holidays: { view: true, modify: true },
        compensatoryOff: { view: true, modify: true },
        bto: { view: true, modify: true },
        employeeReports: { view: true, modify: true },
        
        // Admin Screens
        adminOverview: { view: true, modify: true },
        approvals: { view: true, modify: true },
        employees: { view: true, modify: true },
        workflows: { view: true, modify: true },
        roles: { view: true, modify: true },
        adminReports: { view: true, modify: true },
        importLeaveData: { view: true, modify: true },
        
        // Admin Configuration Screens
        adminLeaveTypes: { view: true, modify: true },
        adminCompOff: { view: true, modify: true },
        adminBTO: { view: true, modify: true },
        adminSettings: { view: true, modify: true },
        
        // Allow On Behalf Actions
        allowOnBehalf: { bto: true, leave: true, compOff: true },
      };
    case 'manager':
      return {
        // Employee Screens
        employeeOverview: { view: true, modify: false },
        leaveApplications: { view: true, modify: false },
        holidays: { view: true, modify: false },
        compensatoryOff: { view: true, modify: false },
        bto: { view: true, modify: false },
        employeeReports: { view: true, modify: false },
        
        // Admin Screens
        adminOverview: { view: true, modify: false },
        approvals: { view: true, modify: true },
        employees: { view: true, modify: false },
        workflows: { view: false, modify: false },
        roles: { view: false, modify: false },
        adminReports: { view: true, modify: false },
        importLeaveData: { view: false, modify: false },
        
        // Admin Configuration Screens
        adminLeaveTypes: { view: false, modify: false },
        adminCompOff: { view: false, modify: false },
        adminBTO: { view: false, modify: false },
        adminSettings: { view: false, modify: false },
        
        // Allow On Behalf Actions
        allowOnBehalf: { bto: true, leave: true, compOff: true },
      };
    case 'employee':
    default:
      return {
        // Employee Screens
        employeeOverview: { view: true, modify: false },
        leaveApplications: { view: true, modify: true },
        holidays: { view: true, modify: false },
        compensatoryOff: { view: true, modify: true },
        bto: { view: true, modify: true },
        employeeReports: { view: true, modify: false },
        
        // Admin Screens
        adminOverview: { view: false, modify: false },
        approvals: { view: false, modify: false },
        employees: { view: false, modify: false },
        workflows: { view: false, modify: false },
        roles: { view: false, modify: false },
        adminReports: { view: false, modify: false },
        importLeaveData: { view: false, modify: false },
        
        // Admin Configuration Screens
        adminLeaveTypes: { view: false, modify: false },
        adminCompOff: { view: false, modify: false },
        adminBTO: { view: false, modify: false },
        adminSettings: { view: false, modify: false },
        
        // Allow On Behalf Actions
        allowOnBehalf: { bto: false, leave: false, compOff: false },
      };
  }
};

export function usePermissions() {
  // Initialize with cache if available to prevent flickering
  const [permissions, setPermissions] = useState<PermissionStructure | null>(permissionsCache);
  const [loading, setLoading] = useState(!permissionsCache);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const role = localStorage.getItem('role_name') || localStorage.getItem('role') || 'employee';
        const orgId = localStorage.getItem('org_id');
        
        // Check cache first to prevent flickering
        const now = Date.now();
        if (permissionsCache && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log('Using cached permissions to prevent flickering');
          setPermissions(permissionsCache);
          setLoading(false);
          return;
        }
        
        console.log('Loading permissions for role:', role);
        
        // Clear cache to force reload of updated permissions
        permissionsCache = null;
        cacheTimestamp = 0;
        
        // Try to fetch role permissions from database first
        if (orgId) {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            
            if (orgId) {
              headers['X-Org-Id'] = orgId;
            }
            
            const response = await fetch('/api/roles', {
              headers,
              credentials: 'include',
            });
            
            if (response.ok) {
              const roles = await response.json();
              const userRole = roles.find((r: any) => r.name.toLowerCase() === role.toLowerCase());
              
              if (userRole && userRole.permissions) {
                console.log('Using database role permissions for', role, ':', userRole.permissions);
                console.log('Workflows permission:', userRole.permissions.workflows);
                
                // Ensure admin has all permissions if database permissions are empty
                let effectivePermissions = userRole.permissions;
                if (role.toLowerCase() === 'admin' && Object.keys(userRole.permissions).length === 0) {
                  effectivePermissions = {
                    employeeOverview: { view: true, modify: true },
                    leaveApplications: { view: true, modify: true },
                    holidays: { view: true, modify: true },
                    compensatoryOff: { view: true, modify: true },
                    pto: { view: true, modify: true },
                    employeeReports: { view: true, modify: true },
                    adminOverview: { view: true, modify: true },
                    approvals: { view: true, modify: true },
                    employees: { view: true, modify: true },
                    workflows: { view: true, modify: true },
                    roles: { view: true, modify: true },
                    adminReports: { view: true, modify: true },
                    importLeaveData: { view: true, modify: true },
                    adminLeaveTypes: { view: true, modify: true },
                    adminCompOff: { view: true, modify: true },
                    adminPTO: { view: true, modify: true },
                    adminSettings: { view: true, modify: true },
                    allowOnBehalf: { pto: true, leave: true, compOff: true }
                  };
                }
                
                // Cache the permissions
                permissionsCache = effectivePermissions;
                cacheTimestamp = Date.now();
                
                setPermissions(effectivePermissions);
                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('Error fetching role permissions from database:', error);
          }
        }
        
        // Fallback to localStorage if database fetch fails
        const customPermissions = localStorage.getItem('user_permissions');
        
        if (customPermissions) {
          console.log('Using user_permissions:', JSON.parse(customPermissions));
          const userPerms = JSON.parse(customPermissions);
          
          // Cache the permissions
          permissionsCache = userPerms;
          cacheTimestamp = Date.now();
          
          setPermissions(userPerms);
        } else {
          // Try to get role-specific custom permissions
          const roleKey = `role_permissions_${role.toLowerCase()}`;
          const rolePermissions = localStorage.getItem(roleKey);
          
          console.log('Checking role key:', roleKey);
          console.log('Role permissions found:', !!rolePermissions);
          
          if (rolePermissions) {
            const parsedRolePermissions = JSON.parse(rolePermissions);
            console.log('Using role permissions:', parsedRolePermissions);
            
            // Cache the permissions
            permissionsCache = parsedRolePermissions;
            cacheTimestamp = Date.now();
            
            setPermissions(parsedRolePermissions);
          } else {
            // Fall back to default role-based permissions
            const defaultPermissions = getDefaultPermissions(role);
            console.log('Using default permissions for role:', role, defaultPermissions);
            
            // Cache the permissions
            permissionsCache = defaultPermissions;
            cacheTimestamp = Date.now();
            
            setPermissions(defaultPermissions);
          }
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Default to employee permissions on error
        const fallbackPermissions = getDefaultPermissions('employee');
        
        // Cache the fallback permissions
        permissionsCache = fallbackPermissions;
        cacheTimestamp = Date.now();
        
        setPermissions(fallbackPermissions);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();

    // Listen for localStorage changes (when user changes role or permissions)
    const handleStorageChange = (e?: StorageEvent) => {
      if (!e || e.key === 'user_permissions' || e.key === 'role' || e.key === 'org_id') {
        // Invalidate cache on role/org changes
        console.log('Storage change detected, invalidating permissions cache');
        permissionsCache = null;
        cacheTimestamp = 0;
        setLoading(true);
        loadPermissions();
      }
    };

    // Custom event listener for same-tab localStorage changes
    const handleCustomStorageChange = (e: CustomEvent) => {
      // Invalidate cache on custom changes
      console.log('Custom permissions change detected, invalidating cache');
      permissionsCache = null;
      cacheTimestamp = 0;
      setLoading(true);
      loadPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('permissions-updated', handleCustomStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('permissions-updated', handleCustomStorageChange as EventListener);
    };
  }, []);

  const hasPermission = (screen: keyof PermissionStructure, action: 'view' | 'modify' = 'view'): boolean => {
    if (!permissions) return false;
    
    const screenPermission = permissions[screen];
    if (!screenPermission) return false;
    
    // Handle allowOnBehalf differently as it has different structure
    if (screen === 'allowOnBehalf') {
      return true; // This is handled separately
    }
    
    return (screenPermission as any)[action] === true;
  };

  const canViewScreen = (screen: keyof PermissionStructure): boolean => {
    return hasPermission(screen, 'view');
  };

  const canModifyScreen = (screen: keyof PermissionStructure): boolean => {
    return hasPermission(screen, 'modify');
  };

  const updatePermissions = (newPermissions: PermissionStructure) => {
    localStorage.setItem('user_permissions', JSON.stringify(newPermissions));
    
    // Update cache
    permissionsCache = newPermissions;
    cacheTimestamp = Date.now();
    
    setPermissions(newPermissions);
  };

  return {
    permissions,
    loading,
    hasPermission,
    canViewScreen,
    canModifyScreen,
    updatePermissions,
  };
}
// Organization context management for multi-tenancy support

const ORG_ID_KEY = 'org_id';
const USER_ID_KEY = 'user_id';
const ROLE_ID_KEY = 'role_id';
const ROLE_NAME_KEY = 'role_name';
const USER_TYPE_ID_KEY = 'user_type_id';

export class OrgContext {
  static getOrgId(): string {
    if (typeof window === 'undefined') return '60'; // Default for SSR
    // Always read fresh from localStorage to catch dynamic changes
    const orgId = localStorage.getItem(ORG_ID_KEY);
    console.log('[OrgContext] Reading org_id from localStorage:', orgId);
    return orgId || '60';
  }

  static setOrgId(orgId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ORG_ID_KEY, orgId);
  }

  static getUserId(): string {
    if (typeof window === 'undefined') return '1435'; // Default for SSR
    return localStorage.getItem(USER_ID_KEY) || '1435';
  }

  static setUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_ID_KEY, userId);
  }

  static getRoleId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ROLE_ID_KEY);
  }

  static setRoleId(roleId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ROLE_ID_KEY, roleId);
  }

  static getRoleName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ROLE_NAME_KEY);
  }

  static setRoleName(roleName: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ROLE_NAME_KEY, roleName);
  }

  static getUserTypeId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_TYPE_ID_KEY);
  }

  static setUserTypeId(userTypeId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_TYPE_ID_KEY, userTypeId);
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ORG_ID_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(ROLE_ID_KEY);
    localStorage.removeItem(ROLE_NAME_KEY);
    localStorage.removeItem(USER_TYPE_ID_KEY);
  }

  static initialize(): void {
    if (typeof window === 'undefined') return;
    
    // Only set defaults if no JWT data exists and no org_id is present
    const hasJWTData = localStorage.getItem(ROLE_ID_KEY) || localStorage.getItem(ROLE_NAME_KEY);
    
    if (!hasJWTData && !localStorage.getItem(ORG_ID_KEY)) {
      console.log('[OrgContext] No JWT data found, setting default org_id to 60');
      localStorage.setItem(ORG_ID_KEY, '60');
      localStorage.setItem(USER_ID_KEY, '1435');
    } else {
      console.log('[OrgContext] Found existing data - org_id:', localStorage.getItem(ORG_ID_KEY), 'role:', localStorage.getItem(ROLE_NAME_KEY));
    }
  }

  static setJWTData(data: {
    org_id: string;
    user_id: string;
    role_id: string;
    role_name: string;
    user_type_id: string;
  }): void {
    if (typeof window === 'undefined') return;
    
    // Use JWT token user_id or preserve existing
    const existingUserId = localStorage.getItem(USER_ID_KEY);
    const userIdToSet = existingUserId || data.user_id;
    
    console.log('[OrgContext] Setting JWT data:', {
      org_id: data.org_id,
      user_id: userIdToSet,
      role_name: data.role_name,
      forcedTo1435: true
    });
    
    localStorage.setItem(ORG_ID_KEY, data.org_id);
    localStorage.setItem(USER_ID_KEY, userIdToSet);
    localStorage.setItem(ROLE_ID_KEY, data.role_id);
    localStorage.setItem(ROLE_NAME_KEY, data.role_name);
    localStorage.setItem(USER_TYPE_ID_KEY, data.user_type_id);
  }

  static getContextData(): { 
    orgId: string; 
    userId: string; 
    roleId: string | null;
    roleName: string | null;
    userTypeId: string | null;
  } {
    return {
      orgId: this.getOrgId(),
      userId: this.getUserId(),
      roleId: this.getRoleId(),
      roleName: this.getRoleName(),
      userTypeId: this.getUserTypeId()
    };
  }
}

// Auto-initialize when module loads in browser
if (typeof window !== 'undefined') {
  OrgContext.initialize();
}

// React hook for using orgContext
import { useState, useEffect } from 'react';

export function useOrgContext() {
  const [orgId, setOrgId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [userTypeId, setUserTypeId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize state from localStorage
    const updateState = () => {
      setOrgId(OrgContext.getOrgId());
      setCurrentUserId(OrgContext.getUserId());
      setRoleId(OrgContext.getRoleId());
      setRoleName(OrgContext.getRoleName());
      setUserTypeId(OrgContext.getUserTypeId());
    };

    updateState();

    // Listen for storage changes to update state
    const handleStorageChange = (e: StorageEvent) => {
      if (['org_id', 'user_id', 'role_id', 'role_name', 'user_type_id'].includes(e.key || '')) {
        updateState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    orgId,
    currentUserId,
    roleId,
    roleName,
    userTypeId,
    setOrgId: (id: string) => {
      OrgContext.setOrgId(id);
      setOrgId(id);
    },
    setUserId: (id: string) => {
      OrgContext.setUserId(id);
      setCurrentUserId(id);
    },
    setRoleId: (id: string) => {
      OrgContext.setRoleId(id);
      setRoleId(id);
    },
    setRoleName: (name: string) => {
      OrgContext.setRoleName(name);
      setRoleName(name);
    },
    setUserTypeId: (id: string) => {
      OrgContext.setUserTypeId(id);
      setUserTypeId(id);
    },
    clear: () => {
      OrgContext.clear();
      setOrgId('');
      setCurrentUserId('');
      setRoleId(null);
      setRoleName(null);
      setUserTypeId(null);
    }
  };
}
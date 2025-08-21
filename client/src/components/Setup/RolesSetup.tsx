import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Role } from "@shared/schema";

interface RolesSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
  showNavigation?: boolean; // Add prop to control navigation buttons visibility
}

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
  importLeaveData: { view: boolean; modify: boolean };
  adminReports: { view: boolean; modify: boolean };
  
  // Admin Configuration Screens
  adminLeaveTypes: { view: boolean; modify: boolean };
  adminCompOff: { view: boolean; modify: boolean };
  adminBTO: { view: boolean; modify: boolean };
  
  // Allow On Behalf Actions
  allowOnBehalf: { bto: boolean; leave: boolean; compOff: boolean };
}

interface FormData {
  name: string;
  description?: string;
  permissions: PermissionStructure;
}

export default function RolesSetup({ onNext, onPrevious, isLast, isLoading, showNavigation = true }: RolesSetupProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    permissions: {
      // Employee Screens
      employeeOverview: { view: false, modify: false },
      leaveApplications: { view: false, modify: false },
      holidays: { view: false, modify: false },
      compensatoryOff: { view: false, modify: false },
      bto: { view: false, modify: false },
      employeeReports: { view: false, modify: false },
      
      // Admin Screens
      adminOverview: { view: false, modify: false },
      approvals: { view: false, modify: false },
      employees: { view: false, modify: false },
      workflows: { view: false, modify: false },
      roles: { view: false, modify: false },
      importLeaveData: { view: false, modify: false },
      adminReports: { view: false, modify: false },
      
      // Admin Configuration Screens
      adminLeaveTypes: { view: false, modify: false },
      adminCompOff: { view: false, modify: false },
      adminBTO: { view: false, modify: false },
      
      // Allow On Behalf Actions
      allowOnBehalf: { bto: false, leave: false, compOff: false },
    },
  });

  const { data: dbRoles = [], isLoading: isLoadingRoles, error: rolesError, isFetching } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
    enabled: true,
  });

  // Show database roles if they exist
  const rolesArray = Array.isArray(dbRoles) ? dbRoles : [];
  const displayRoles = rolesArray.filter((role: Role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if we should show empty state - simplified logic
  const showEmptyState = !isLoadingRoles && rolesArray.length === 0;

  // Debug logging
  useEffect(() => {
    const orgId = localStorage.getItem('org_id');
    console.log('[RolesSetup] Debug state:', {
      orgId,
      isLoadingRoles,
      isFetching,
      dbRolesLength: dbRoles?.length,
      displayRolesLength: displayRoles.length,
      showEmptyState,
      rolesData: dbRoles?.map(r => r.name)
    });
  }, [isLoadingRoles, isFetching, dbRoles, displayRoles.length, showEmptyState]);

  // Role creation mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      if (editingRole) {
        return await apiRequest("PATCH", `/api/roles/${editingRole.id}`, roleData);
      } else {
        return await apiRequest("POST", "/api/roles", roleData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: `Role ${editingRole ? "updated" : "created"} successfully.`,
      });
      setShowRoleForm(false);
      setEditingRole(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingRole ? "update" : "create"} role. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Role deletion mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest("DELETE", `/api/roles/${roleId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully.",
      });
      setShowRoleForm(false);
      setEditingRole(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: {
        // Employee Screens
        employeeOverview: { view: false, modify: false },
        leaveApplications: { view: false, modify: false },
        holidays: { view: false, modify: false },
        compensatoryOff: { view: false, modify: false },
        bto: { view: false, modify: false },
        employeeReports: { view: false, modify: false },
        
        // Admin Screens
        adminOverview: { view: false, modify: false },
        approvals: { view: false, modify: false },
        employees: { view: false, modify: false },
        workflows: { view: false, modify: false },
        roles: { view: false, modify: false },
        importLeaveData: { view: false, modify: false },
        adminReports: { view: false, modify: false },
        
        // Admin Configuration Screens
        adminLeaveTypes: { view: false, modify: false },
        adminCompOff: { view: false, modify: false },
        adminBTO: { view: false, modify: false },
        
        // Allow On Behalf Actions
        allowOnBehalf: { bto: false, leave: false, compOff: false },
      },
    });
    setShowRoleForm(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    
    // Parse permissions from database
    let permissions: PermissionStructure;
    try {
      permissions = typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions as PermissionStructure;
    } catch (error) {
      console.error('Error parsing role permissions:', error);
      permissions = formData.permissions; // fallback to default
    }
    
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions,
    });
    setShowRoleForm(true);
  };

  const handleCloseForm = () => {
    setShowRoleForm(false);
    setEditingRole(null);
  };

  const handleSaveRole = () => {
    if (!formData.name || !formData.permissions) {
      toast({
        title: "Error",
        description: "Please provide a role name and permissions",
        variant: "destructive"
      });
      return;
    }

    const roleData = {
      name: formData.name,
      description: formData.description || "",
      permissions: formData.permissions,
    };

    createRoleMutation.mutate(roleData);
  };

  const handleDeleteRole = () => {
    if (editingRole) {
      deleteRoleMutation.mutate(editingRole.id);
    }
  };

  const updatePermission = (category: string, type: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...(prev.permissions[category as keyof PermissionStructure] as { view: boolean; modify: boolean }),
          [type]: value,
        },
      },
    }));
  };

  const updateAllowOnBehalf = (type: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        allowOnBehalf: {
          ...prev.permissions.allowOnBehalf,
          [type]: value,
        },
      },
    }));
  };

  // Bulk permission updates
  const checkAllView = () => {
    const permissionKeys = [
      'employeeOverview', 'leaveApplications', 'holidays', 'compensatoryOff', 'bto', 'employeeReports',
      'adminOverview', 'approvals', 'employees', 'workflows', 'roles', 'importLeaveData', 'adminReports',
      'adminLeaveTypes', 'adminCompOff', 'adminBTO'
    ];
    
    setFormData(prev => {
      const updatedPermissions = { ...prev.permissions };
      permissionKeys.forEach(key => {
        if (updatedPermissions[key as keyof PermissionStructure]) {
          (updatedPermissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean }).view = true;
        }
      });
      return { ...prev, permissions: updatedPermissions };
    });
  };

  const checkAllModify = () => {
    const permissionKeys = [
      'employeeOverview', 'leaveApplications', 'holidays', 'compensatoryOff', 'bto', 'employeeReports',
      'adminOverview', 'approvals', 'employees', 'workflows', 'roles', 'importLeaveData', 'adminReports',
      'adminLeaveTypes', 'adminCompOff', 'adminBTO'
    ];
    
    setFormData(prev => {
      const updatedPermissions = { ...prev.permissions };
      permissionKeys.forEach(key => {
        if (updatedPermissions[key as keyof PermissionStructure]) {
          (updatedPermissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean }).modify = true;
        }
      });
      return { ...prev, permissions: updatedPermissions };
    });
  };

  const uncheckAllView = () => {
    const permissionKeys = [
      'employeeOverview', 'leaveApplications', 'holidays', 'compensatoryOff', 'bto', 'employeeReports',
      'adminOverview', 'approvals', 'employees', 'workflows', 'roles', 'importLeaveData', 'adminReports',
      'adminLeaveTypes', 'adminCompOff', 'adminBTO'
    ];
    
    setFormData(prev => {
      const updatedPermissions = { ...prev.permissions };
      permissionKeys.forEach(key => {
        if (updatedPermissions[key as keyof PermissionStructure]) {
          (updatedPermissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean }).view = false;
        }
      });
      return { ...prev, permissions: updatedPermissions };
    });
  };

  const uncheckAllModify = () => {
    const permissionKeys = [
      'employeeOverview', 'leaveApplications', 'holidays', 'compensatoryOff', 'bto', 'employeeReports',
      'adminOverview', 'approvals', 'employees', 'workflows', 'roles', 'importLeaveData', 'adminReports',
      'adminLeaveTypes', 'adminCompOff', 'adminBTO'
    ];
    
    setFormData(prev => {
      const updatedPermissions = { ...prev.permissions };
      permissionKeys.forEach(key => {
        if (updatedPermissions[key as keyof PermissionStructure]) {
          (updatedPermissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean }).modify = false;
        }
      });
      return { ...prev, permissions: updatedPermissions };
    });
  };

  if (showRoleForm) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingRole ? "Update Role" : "Create Role"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseForm}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Role Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name
              </label>
              <div className="flex space-x-2">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter role name"
                  className="flex-1"
                />
                {editingRole && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteRole}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Delete Role
                  </Button>
                )}
              </div>
            </div>

            {/* Role Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description"
              />
            </div>

            {/* Role Permissions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Role Permissions</h3>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkAllView}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Check All View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={uncheckAllView}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Uncheck All View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkAllModify}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Check All Modify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={uncheckAllModify}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Uncheck All Modify
                  </Button>
                </div>
              </div>
              <div className="space-y-6">
                {/* Employee Screens */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Employee Screens</h4>
                  <div className="space-y-2">
                    {[
                      { key: "employeeOverview", label: "Employee Overview" },
                      { key: "leaveApplications", label: "Leave Applications" },
                      { key: "holidays", label: "Holidays" },
                      { key: "compensatoryOff", label: "Compensatory Off" },
                      { key: "bto", label: "BTO" },
                      { key: "employeeReports", label: "Employee Reports" },
                    ].map(({ key, label }) => {
                      const permission = formData.permissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean };
                      return (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex space-x-6">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.view || false}
                                onCheckedChange={(checked) => updatePermission(key, "view", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">View</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.modify || false}
                                onCheckedChange={(checked) => updatePermission(key, "modify", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">Modify</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Admin Screens */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Admin Screens</h4>
                  <div className="space-y-2">
                    {[
                      { key: "adminOverview", label: "Admin Overview" },
                      { key: "approvals", label: "Approvals" },
                      { key: "employees", label: "Employees" },
                      { key: "workflows", label: "Workflows" },
                      { key: "roles", label: "Roles" },
                      { key: "importLeaveData", label: "Import Leave Data" },
                      { key: "adminReports", label: "Admin Reports" },
                    ].map(({ key, label }) => {
                      const permission = formData.permissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean };
                      return (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex space-x-6">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.view || false}
                                onCheckedChange={(checked) => updatePermission(key, "view", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">View</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.modify || false}
                                onCheckedChange={(checked) => updatePermission(key, "modify", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">Modify</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Admin Configuration Screens */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Admin Configuration</h4>
                  <div className="space-y-2">
                    {[
                      { key: "adminLeaveTypes", label: "Leave Types Configuration" },
                      { key: "adminCompOff", label: "Comp Off Configuration" },
                      { key: "adminBTO", label: "BTO Configuration" },
                      { key: "adminSettings", label: "General Settings (Black Out Periods & Features)" },
                    ].map(({ key, label }) => {
                      const permission = formData.permissions[key as keyof PermissionStructure] as { view: boolean; modify: boolean };
                      return (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex space-x-6">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.view || false}
                                onCheckedChange={(checked) => updatePermission(key, "view", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">View</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={permission?.modify || false}
                                onCheckedChange={(checked) => updatePermission(key, "modify", checked as boolean)}
                              />
                              <span className="text-sm text-gray-600">Modify</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Allow On Behalf Actions */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Allow On Behalf Actions</h4>
                  <div className="space-y-2">
                    {[
                      { key: "bto", label: "BTO Applications" },
                      { key: "leave", label: "Leave Applications" },
                      { key: "compOff", label: "Comp Off Applications" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-700">{label}</span>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.permissions.allowOnBehalf?.[key as keyof typeof formData.permissions.allowOnBehalf] || false}
                            onCheckedChange={(checked) => updateAllowOnBehalf(key, checked as boolean)}
                          />
                          <span className="text-sm text-gray-600">Allow</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveRole}
                disabled={createRoleMutation.isPending || deleteRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? "Saving..." : (editingRole ? "Update Role" : "Create Role")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Roles</h2>
        
        {/* Search and Create */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search for Roles"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleCreateRole}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Loading State */}
        {isLoadingRoles && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading roles...</div>
          </div>
        )}

        {/* Error State */}
        {rolesError && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">Error loading roles</h3>
                <p className="text-sm">{rolesError.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {showEmptyState && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">No roles created yet</h3>
                <p>Create your first role to get started with permission management.</p>
                <p className="text-sm mt-2">Default roles (Admin, Manager, Employee) will be created automatically when you complete the setup.</p>
              </div>
              <Button
                onClick={handleCreateRole}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Roles Grid */}
        {displayRoles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRoles.map((role) => (
              <Card key={role.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRole(role)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {role.description && (
                    <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Created: {(role as any).createdAt ? new Date((role as any).createdAt).toLocaleDateString() : "Unknown"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {showNavigation && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button onClick={onNext} disabled={isLoading}>
            {isLast ? "Finish Setup" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
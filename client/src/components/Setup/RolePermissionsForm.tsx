import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface RolePermissionsFormProps {
  role?: any;
  onClose: () => void;
}

interface PermissionSet {
  view: boolean;
  modify: boolean;
}

interface OnBehalfPermissions {
  pto: boolean;
  leave: boolean;
  compOff: boolean;
}

interface RolePermissions {
  leaveApproval: PermissionSet;
  workflows: PermissionSet;
  leaveTypes: PermissionSet;
  leaveConfigurations: PermissionSet;
  ptoConfigurations: PermissionSet;
  compOffConfigurations: PermissionSet;
  allowOnBehalfOf: OnBehalfPermissions;
}

export default function RolePermissionsForm({ role, onClose }: RolePermissionsFormProps) {
  const { toast } = useToast();
  const isEditing = !!role;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
    }
  });

  // Initialize permissions state
  const [permissions, setPermissions] = useState<RolePermissions>({
    leaveApproval: role?.permissions?.leaveApproval || { view: false, modify: false },
    workflows: role?.permissions?.workflows || { view: false, modify: false },
    leaveTypes: role?.permissions?.leaveTypes || { view: false, modify: false },
    leaveConfigurations: role?.permissions?.leaveConfigurations || { view: false, modify: false },
    ptoConfigurations: role?.permissions?.ptoConfigurations || { view: false, modify: false },
    compOffConfigurations: role?.permissions?.compOffConfigurations || { view: false, modify: false },
    allowOnBehalfOf: role?.permissions?.allowOnBehalfOf || { pto: false, leave: false, compOff: false },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        permissions
      };
      
      if (isEditing) {
        return await apiRequest("PATCH", `/api/roles/${role.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/roles", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Success",
        description: `Role ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} role.`,
        variant: "destructive",
      });
    },
  });

  const updatePermission = (category: keyof RolePermissions, field: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const PermissionRow = ({ 
    title, 
    category, 
    hasViewModify = true 
  }: { 
    title: string; 
    category: keyof RolePermissions; 
    hasViewModify?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm font-medium text-gray-700">{title}</span>
      {hasViewModify ? (
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">View</span>
            <Switch
              checked={(permissions[category] as PermissionSet).view}
              onCheckedChange={(checked) => updatePermission(category, 'view', checked)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Modify</span>
            <Switch
              checked={(permissions[category] as PermissionSet).modify}
              onCheckedChange={(checked) => updatePermission(category, 'modify', checked)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </h2>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="space-y-6">
          {/* Role Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Role Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Role Name *
                </label>
                <input
                  {...register("name", { required: "Role name is required" })}
                  type="text"
                  placeholder="Enter role name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
                <textarea
                  {...register("description")}
                  placeholder="Enter role description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <PermissionRow title="Leave Approval" category="leaveApproval" />
                <PermissionRow title="Workflows" category="workflows" />
                <PermissionRow title="Leave Types" category="leaveTypes" />
                <PermissionRow title="Leave Configurations" category="leaveConfigurations" />
                <PermissionRow title="BTO Configurations" category="ptoConfigurations" />
                <PermissionRow title="Comp-Off Configurations" category="compOffConfigurations" />
              </div>
            </CardContent>
          </Card>

          {/* Allow On Behalf Of Others */}
          <Card>
            <CardHeader>
              <CardTitle>Allow On Behalf Of Others</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">BTO</span>
                  <Switch
                    checked={permissions.allowOnBehalfOf.pto}
                    onCheckedChange={(checked) => updatePermission('allowOnBehalfOf', 'pto', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Leave</span>
                  <Switch
                    checked={permissions.allowOnBehalfOf.leave}
                    onCheckedChange={(checked) => updatePermission('allowOnBehalfOf', 'leave', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Comp-Off</span>
                  <Switch
                    checked={permissions.allowOnBehalfOf.compOff}
                    onCheckedChange={(checked) => updatePermission('allowOnBehalfOf', 'compOff', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMutation.isPending ? "Processing..." : (isEditing ? "Update Role" : "Create Role")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
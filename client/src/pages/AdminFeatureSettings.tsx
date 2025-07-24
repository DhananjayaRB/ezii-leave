import { useState } from "react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Settings, Users, MessageSquare, Mail, ClipboardList } from "lucide-react";

export default function AdminFeatureSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/collaborative-leave-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return await apiRequest('PUT', '/api/collaborative-leave-settings', updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborative-leave-settings'] });
      toast({
        title: "Settings Updated",
        description: "Collaborative leave settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState({
    enabled: false,
    requireManagerApproval: false,
    enableEmailNotifications: true,
    closureReportRequired: true,
    managerReviewRequired: true,
  });

  // Update form data when settings load using useEffect
  React.useEffect(() => {
    if (settings && typeof settings === 'object') {
      setFormData({
        enabled: (settings as any).enabled ?? false,
        requireManagerApproval: (settings as any).requireManagerApproval ?? false,
        enableEmailNotifications: (settings as any).enableEmailNotifications ?? true,
        closureReportRequired: (settings as any).closureReportRequired ?? true,
        managerReviewRequired: (settings as any).managerReviewRequired ?? true,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-3">
        <Settings className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Feature Settings</h1>
          <p className="text-gray-600">Configure collaborative leave management features</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Collaborative Leave Management</CardTitle>
              <CardDescription>Enable employees to assign tasks to colleagues during leave periods</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <Label className="text-lg font-medium">Enable Collaborative Leave</Label>
              <p className="text-sm text-gray-600">Allow employees to create task assignments when applying for leave</p>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => updateField('enabled', checked)}
              className="scale-125"
            />
          </div>

          {/* Settings - Only show when enabled */}
          {formData.enabled && (
            <div className="space-y-6 pl-4">
              {/* Approval & Review Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-gray-500" />
                  Approval & Review Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Manager Approval Required</Label>
                      <p className="text-sm text-gray-600">Require manager approval for task assignments</p>
                    </div>
                    <Switch
                      checked={formData.requireManagerApproval}
                      onCheckedChange={(checked) => updateField('requireManagerApproval', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Closure Report Required</Label>
                      <p className="text-sm text-gray-600">Require completion reports after leave</p>
                    </div>
                    <Switch
                      checked={formData.closureReportRequired}
                      onCheckedChange={(checked) => updateField('closureReportRequired', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Manager Review Required</Label>
                      <p className="text-sm text-gray-600">Require manager review of completion reports</p>
                    </div>
                    <Switch
                      checked={formData.managerReviewRequired}
                      onCheckedChange={(checked) => updateField('managerReviewRequired', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                  Notification Settings
                </h3>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Notifications
                    </Label>
                    <p className="text-sm text-gray-600">Send email notifications to assignees and managers</p>
                  </div>
                  <Switch
                    checked={formData.enableEmailNotifications}
                    onCheckedChange={(checked) => updateField('enableEmailNotifications', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="px-8"
            >
              {updateSettingsMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
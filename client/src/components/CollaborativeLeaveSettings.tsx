import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function CollaborativeLeaveSettings() {
  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/collaborative-leave-settings'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isEnabled = settings?.enabled ?? false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Collaborative Leave Management</CardTitle>
                <CardDescription>
                  Enable task assignment and collaboration during employee leave periods
                </CardDescription>
              </div>
            </div>
            <Badge className={isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {isEnabled ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Disabled
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        
        {isEnabled && settings && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="font-semibold text-blue-900">{settings.maxTasksPerLeave}</div>
                <div className="text-blue-700">Max Tasks</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="font-semibold text-green-900">{settings.defaultNotificationMethod}</div>
                <div className="text-green-700">Notification</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="font-semibold text-purple-900">{settings.autoReminderDays} days</div>
                <div className="text-purple-700">Auto Reminder</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="font-semibold text-orange-900">
                  {settings.requireManagerApproval ? "Required" : "Optional"}
                </div>
                <div className="text-orange-700">Manager Approval</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span>Email Notifications: </span>
                <Badge variant={settings.enableEmailNotifications ? "default" : "secondary"}>
                  {settings.enableEmailNotifications ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span>WhatsApp Notifications: </span>
                <Badge variant={settings.enableWhatsApp ? "default" : "secondary"}>
                  {settings.enableWhatsApp ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <span>Closure Report: </span>
                <Badge variant={settings.closureReportRequired ? "default" : "secondary"}>
                  {settings.closureReportRequired ? "Required" : "Optional"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <span>Manager Review: </span>
                <Badge variant={settings.managerReviewRequired ? "default" : "secondary"}>
                  {settings.managerReviewRequired ? "Required" : "Optional"}
                </Badge>
              </div>
            </div>
          </CardContent>
        )}

        {!isEnabled && (
          <CardContent>
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Collaborative Leave Disabled</h3>
              <p className="text-gray-500 mb-4">
                Enable collaborative leave management to allow employees to assign tasks to colleagues during leave periods.
              </p>
              <Link href="/admin/feature-settings">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>

      {isEnabled && (
        <div className="flex justify-end">
          <Link href="/admin/feature-settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Settings
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
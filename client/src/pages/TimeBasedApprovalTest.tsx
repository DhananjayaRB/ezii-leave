import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function TimeBasedApprovalTest() {
  // Query to get pending time-based approvals
  const { data: pendingApprovals, isLoading, refetch } = useQuery({
    queryKey: ["/api/pending-time-based-approvals"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to process time-based approvals
  const processApprovalsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/process-time-based-approvals", "POST");
    },
    onSuccess: (data) => {
      toast({
        title: "Time-based Approvals Processed",
        description: `Processed ${data.processed} requests`,
        variant: data.errors?.length > 0 ? "destructive" : "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error Processing Approvals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) {
      return `${Math.abs(diffHours)}h ${Math.abs(diffMinutes)}m ago (Ready for processing)`;
    } else {
      return `In ${diffHours}h ${diffMinutes}m`;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time-Based Auto-Approval Test</h1>
          <p className="text-gray-500 mt-2">
            Monitor and process time-based auto-approval requests
          </p>
        </div>
        <Button
          onClick={() => processApprovalsMutation.mutate()}
          disabled={processApprovalsMutation.isPending}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {processApprovalsMutation.isPending ? "Processing..." : "Process Due Approvals"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Time-Based Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingApprovals?.pendingApprovals?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requests with scheduled auto-approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ready for Processing
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {pendingApprovals?.pendingApprovals?.filter((approval: any) => 
                new Date(approval.scheduledAt) <= new Date()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Approvals past scheduled time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Auto-Refresh
            </CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              Every 30 seconds
            </div>
            <p className="text-xs text-muted-foreground">
              Page refreshes automatically
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Time-Based Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pendingApprovals?.pendingApprovals?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending time-based approvals found
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals?.pendingApprovals?.map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      Leave Request #{approval.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      User ID: {approval.userId} | Leave Type: {approval.leaveTypeId}
                    </div>
                    <div className="text-sm text-gray-500">
                      Current Step: {approval.currentStep} | Workflow: {approval.workflowId}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge
                      variant={
                        new Date(approval.scheduledAt) <= new Date()
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {new Date(approval.scheduledAt) <= new Date()
                        ? "Ready"
                        : "Scheduled"}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {formatScheduledTime(approval.scheduledAt)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(approval.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
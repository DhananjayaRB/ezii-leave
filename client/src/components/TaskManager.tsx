import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, XCircle, AlertCircle, MessageSquare, Mail, Phone, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: number;
  leaveRequestId: number;
  assigneeName: string;
  assigneeEmail: string;
  assigneePhone?: string;
  taskDescription: string;
  expectedSupportDate: string;
  notificationMethod: string;
  status: string;
  acceptanceResponse?: string;
  statusComments?: string;
  notificationSent: boolean;
  acceptedAt?: string;
  lastStatusUpdate: string;
  uniqueLink: string;
  orgId: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskManagerProps {
  leaveRequestId: number;
  isEmployee?: boolean; // Whether viewing as employee or admin
}

const statusConfig = {
  pending: { 
    icon: Clock, 
    color: "bg-yellow-100 text-yellow-800", 
    label: "Pending" 
  },
  accepted: { 
    icon: CheckCircle, 
    color: "bg-blue-100 text-blue-800", 
    label: "Accepted" 
  },
  rejected: { 
    icon: XCircle, 
    color: "bg-red-100 text-red-800", 
    label: "Rejected" 
  },
  done: { 
    icon: CheckCircle, 
    color: "bg-green-100 text-green-800", 
    label: "Done" 
  },
  wip: { 
    icon: AlertCircle, 
    color: "bg-orange-100 text-orange-800", 
    label: "In Progress" 
  },
  not_done: { 
    icon: XCircle, 
    color: "bg-red-100 text-red-800", 
    label: "Not Done" 
  },
  abandoned: { 
    icon: XCircle, 
    color: "bg-gray-100 text-gray-800", 
    label: "Abandoned" 
  }
};

export default function TaskManager({ leaveRequestId, isEmployee = false }: TaskManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusUpdateComment, setStatusUpdateComment] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Fetch tasks for the leave request
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [`/api/leave-requests/${leaveRequestId}/tasks`],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, comments }: { taskId: number; status: string; comments: string }) => {
      const task = tasks.find((t: Task) => t.id === taskId);
      if (!task) throw new Error("Task not found");
      
      return await apiRequest(`/api/tasks/${task.uniqueLink}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, comments }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leave-requests/${leaveRequestId}/tasks`] });
      setSelectedTask(null);
      setStatusUpdateComment("");
      setNewStatus("");
      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedTask || !newStatus) return;
    
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      status: newStatus,
      comments: statusUpdateComment
    });
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={`${config.color} border-0`}>
        {getStatusIcon(status)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const getNotificationIcon = (method: string) => {
    switch (method) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <Phone className="h-4 w-4" />;
      case "both":
        return (
          <div className="flex space-x-1">
            <Mail className="h-3 w-3" />
            <Phone className="h-3 w-3" />
          </div>
        );
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Assigned</h3>
          <p className="text-gray-500">
            {isEmployee 
              ? "No collaborative tasks have been assigned for this leave request."
              : "This leave request doesn't have any collaborative tasks assigned."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collaborative Tasks ({tasks.length})</h3>
        <div className="text-sm text-gray-500">
          Last updated: {format(new Date(Math.max(...tasks.map((t: Task) => new Date(t.lastStatusUpdate).getTime()))), "PPp")}
        </div>
      </div>

      <div className="grid gap-4">
        {tasks.map((task: Task) => (
          <Card key={task.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <CardTitle className="text-base">{task.assigneeName}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <span>{task.assigneeEmail}</span>
                      {task.assigneePhone && (
                        <>
                          <span>•</span>
                          <span>{task.assigneePhone}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(task.notificationMethod)}
                  {getStatusBadge(task.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Task Description</Label>
                <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-md">
                  {task.taskDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="font-medium">Expected Date:</span>
                    <div className="text-gray-600">
                      {format(new Date(task.expectedSupportDate), "PPP")}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Last Update:</span>
                  <div className="text-gray-600">
                    {format(new Date(task.lastStatusUpdate), "PPp")}
                  </div>
                </div>
              </div>

              {(task.acceptanceResponse || task.statusComments) && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <Label className="text-sm font-medium text-blue-900">Comments</Label>
                  <p className="text-sm text-blue-800 mt-1">
                    {task.acceptanceResponse || task.statusComments}
                  </p>
                </div>
              )}

              {!isEmployee && task.status !== "done" && task.status !== "not_done" && task.status !== "abandoned" && (
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setNewStatus(task.status);
                    }}
                    className="w-full"
                  >
                    Update Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Update Modal/Dialog */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Task Status</CardTitle>
              <CardDescription>
                Update the status for {selectedTask.assigneeName}'s task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="wip">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="not_done">Not Done</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  value={statusUpdateComment}
                  onChange={(e) => setStatusUpdateComment(e.target.value)}
                  placeholder="Add any relevant comments about the status update..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(null);
                    setStatusUpdateComment("");
                    setNewStatus("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updateTaskMutation.isPending || !newStatus}
                >
                  {updateTaskMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
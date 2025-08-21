import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, XCircle, Clock, User, Mail, Phone, MessageCircle, Search, Filter, CalendarIcon, CheckSquare, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useOrgContext } from "@/lib/orgContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Task {
  id: number;
  leaveRequestId: number;
  assigneeName: string;
  assigneeUserId: string;
  assigneeEmail: string;
  assigneePhone?: string;
  taskDescription: string;
  expectedSupportDate: string;
  expectedSupportDateFrom?: string;
  expectedSupportDateTo?: string;
  additionalNotes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'done' | 'not_done';
  acceptanceResponse?: string;
  statusComments?: string;
  acceptedAt?: string;
  lastStatusUpdate?: string;
  uniqueLink: string;
  orgId: number;
  createdAt: string;
  updatedAt: string;
}

export default function TaskManager() {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [rejectionComment, setRejectionComment] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completionComment, setCompletionComment] = useState("");
  const [completionStatus, setCompletionStatus] = useState<"complete" | "incomplete" | "">("");
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
  // Filter states for Tasks Assigned to Me
  const [assignedToMeFilters, setAssignedToMeFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  
  // Filter states for Tasks I Assigned
  const [tasksIAssignedFilters, setTasksIAssignedFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  
  const { orgId } = useOrgContext();
  const queryClient = useQueryClient();

  // Initialize user ID from localStorage
  useEffect(() => {
    const userId = localStorage.getItem('user_id') || '';
    setCurrentUserId(userId);
  }, []);

  // Note: User context is preserved from localStorage - no automatic overrides
  
  console.log('TaskManager - Current user ID from localStorage:', currentUserId);

  // Fetch tasks assigned TO current user
  const { data: assignedToMe = [] } = useQuery<Task[]>({
    queryKey: [`/api/tasks/assigned-to-me/${currentUserId}`],
    enabled: !!currentUserId,
  });

  // Fetch tasks assigned BY current user
  const { data: assignedByMe = [] } = useQuery<Task[]>({
    queryKey: [`/api/tasks/assigned-by-me/${currentUserId}`],
    enabled: !!currentUserId,
  });


  
  console.log('TaskManager - Tasks assigned to me:', assignedToMe);
  console.log('TaskManager - Tasks assigned by me:', assignedByMe);

  // Filter function for tasks
  const filterTasks = (tasks: Task[], filters: typeof assignedToMeFilters) => {
    return tasks.filter(task => {
      // Search filter (task description, assignee name, email)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          task.taskDescription.toLowerCase().includes(searchLower) ||
          task.assigneeName.toLowerCase().includes(searchLower) ||
          task.assigneeEmail.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // Date range filter (based on created date)
      if (filters.dateFrom) {
        const taskDate = new Date(task.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (taskDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const taskDate = new Date(task.createdAt);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include full day
        if (taskDate > toDate) return false;
      }

      return true;
    });
  };

  // Filtered task lists using useMemo for performance
  const filteredAssignedToMe = useMemo(() => 
    filterTasks(assignedToMe, assignedToMeFilters), 
    [assignedToMe, assignedToMeFilters]
  );

  const filteredTasksIAssigned = useMemo(() => 
    filterTasks(assignedByMe, tasksIAssignedFilters), 
    [assignedByMe, tasksIAssignedFilters]
  );

  // Accept task mutation
  const acceptTaskMutation = useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: number; comment?: string }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/accept`, {
        acceptanceResponse: comment || "Task accepted"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-to-me/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-by-me/${currentUserId}`] });
      toast({
        title: "Task Accepted",
        description: "You have successfully accepted this task.",
      });
      setSelectedTask(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reject task mutation
  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: number; comment: string }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/reject`, {
        statusComments: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-to-me/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-by-me/${currentUserId}`] });
      toast({
        title: "Task Rejected",
        description: "You have rejected this task with your feedback.",
      });
      setSelectedTask(null);
      setRejectionComment("");
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, comment }: { taskId: number; status: string; comment: string }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/complete`, {
        status: status === "complete" ? "done" : "not_done",
        statusComments: comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-to-me/${currentUserId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/assigned-by-me/${currentUserId}`] });
      toast({
        title: "Task Updated",
        description: "You have updated the task status with your feedback.",
      });
      setShowCompletionDialog(false);
      setSelectedTask(null);
      setCompletionComment("");
      setCompletionStatus("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'done':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
      case 'not_done':
        return <Badge className="bg-orange-100 text-orange-800"><XCircle className="w-3 h-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  // Enhanced Filter component with compact design
  const TaskFilters = ({ 
    filters, 
    onFiltersChange, 
    title 
  }: { 
    filters: typeof assignedToMeFilters; 
    onFiltersChange: (filters: typeof assignedToMeFilters) => void;
    title: string;
  }) => (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Filter Tasks</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Refine your search</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onFiltersChange({ search: "", status: "all", dateFrom: "", dateTo: "" })}
          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks, names, emails..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
          <Select 
            value={filters.status} 
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">🟡 Pending</SelectItem>
              <SelectItem value="accepted">🟢 Accepted</SelectItem>
              <SelectItem value="done">✅ Complete</SelectItem>
              <SelectItem value="not_done">🔴 Incomplete</SelectItem>
              <SelectItem value="rejected">❌ Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">To Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const TaskCard = ({ task, showActions = false }: { task: Task; showActions?: boolean }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 mb-3">
      <div className="p-4">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              {task.assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-base text-gray-900 dark:text-gray-100 mb-1">{task.assigneeName}</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-500" />
                  {task.assigneeEmail}
                </span>
                {task.assigneePhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-green-500" />
                    {task.assigneePhone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
              #{task.id}
            </div>
          </div>
        </div>

        {/* Task Description */}
        <div className="mb-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 border-l-3 border-blue-500">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1 text-sm">
              <MessageCircle className="w-3 h-3 text-blue-500" />
              Task Description
            </h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{task.taskDescription}</p>
          </div>
        </div>

        {/* Support Date and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-md p-3 border border-orange-200 dark:border-orange-800">
            <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1 flex items-center gap-1 text-sm">
              <Calendar className="w-3 h-3 text-orange-600" />
              Support Date
            </h4>
            <p className="text-orange-800 dark:text-orange-200 font-medium text-sm">
              {task.expectedSupportDateFrom && task.expectedSupportDateTo
                ? `${format(new Date(task.expectedSupportDateFrom), 'MMM dd, yyyy')} - ${format(new Date(task.expectedSupportDateTo), 'MMM dd, yyyy')}`
                : format(new Date(task.expectedSupportDate), 'MMM dd, yyyy')
              }
            </p>
          </div>

          {task.additionalNotes && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-md p-3 border border-purple-200 dark:border-purple-800">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1 flex items-center gap-1 text-sm">
                <MessageCircle className="w-3 h-3 text-purple-600" />
                Additional Notes
              </h4>
              <p className="text-purple-800 dark:text-purple-200 text-sm">{task.additionalNotes}</p>
            </div>
          )}
        </div>

        {/* Acceptance Response */}
        {task.acceptanceResponse && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-md p-3 mb-3">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-1 flex items-center gap-1 text-sm">
              <CheckCircle className="w-3 h-3 text-green-600" />
              Acceptance Response
            </h4>
            <div className="bg-white dark:bg-gray-800 rounded-md p-2 border border-green-200 dark:border-green-700">
              <p className="text-green-800 dark:text-green-200 font-medium italic text-sm">"{task.acceptanceResponse}"</p>
              {task.acceptedAt && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Accepted: {format(new Date(task.acceptedAt), 'MMM dd, yyyy \'at\' h:mm a')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Task Completion Feedback */}
        {(task.status === 'done' || task.status === 'not_done' || task.status === 'accepted') && task.statusComments && (
          <div className={`rounded-md p-3 mb-3 border ${
            task.status === 'done' ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-300 dark:border-green-700' :
            task.status === 'not_done' ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-red-300 dark:border-red-700' :
            'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-300 dark:border-blue-700'
          }`}>
            <h4 className={`font-medium mb-2 flex items-center gap-1 text-sm ${
              task.status === 'done' ? 'text-green-900 dark:text-green-100' :
              task.status === 'not_done' ? 'text-red-900 dark:text-red-100' :
              'text-blue-900 dark:text-blue-100'
            }`}>
              {task.status === 'done' && <CheckCircle className="w-3 h-3 text-green-600" />}
              {task.status === 'not_done' && <XCircle className="w-3 h-3 text-red-600" />}
              {task.status === 'accepted' && <MessageCircle className="w-3 h-3 text-blue-600" />}
              Task Completion Feedback
            </h4>
            
            <div className="bg-white dark:bg-gray-800 rounded-md p-2 border">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`font-medium text-xs ${
                  task.status === 'done' ? 'text-green-600 dark:text-green-400' : 
                  task.status === 'not_done' ? 'text-red-600 dark:text-red-400' : 
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {task.status === 'done' ? '✅ Completed Successfully' : 
                   task.status === 'not_done' ? '❌ Incomplete' : 
                   '🔄 In Progress'}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 italic font-medium text-sm">"{task.statusComments}"</p>
              {task.lastStatusUpdate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last updated: {format(new Date(task.lastStatusUpdate), 'MMM dd, yyyy \'at\' h:mm a')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && task.status === 'pending' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={() => acceptTaskMutation.mutate({ taskId: task.id })}
              disabled={acceptTaskMutation.isPending}
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accept Task
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setSelectedTask(task)}
              disabled={rejectTaskMutation.isPending}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-400"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject Task
            </Button>
          </div>
        )}

        {showActions && task.status === 'accepted' && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={() => {
                setSelectedTask(task);
                setShowCompletionDialog(true);
              }}
              disabled={completeTaskMutation.isPending}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Update Task Status
            </Button>
          </div>
        )}
      </div>
    </div>
  );



  return (
    <Layout>
      <div className="space-y-8">
        {/* Clean Header Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
              <p className="text-gray-600">Manage collaborative leave tasks with ease</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedToMe.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-gray-600 text-sm">Pending Tasks</div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedToMe.filter(t => t.status === 'accepted').length}
                  </div>
                  <div className="text-gray-600 text-sm">Accepted</div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedToMe.filter(t => t.status === 'done').length}
                  </div>
                  <div className="text-gray-600 text-sm">Completed</div>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedByMe.length}
                  </div>
                  <div className="text-gray-600 text-sm">Tasks Assigned</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="assigned-to-me" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <TabsTrigger 
              value="assigned-to-me"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg font-medium h-full"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                <span>Tasks Assigned to Me</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredAssignedToMe.length}/{assignedToMe.length}
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="assigned-by-me"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg font-medium h-full"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Tasks I Assigned</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredTasksIAssigned.length}/{assignedByMe.length}
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="assigned-to-me" className="mt-6">
          <TaskFilters 
            filters={assignedToMeFilters}
            onFiltersChange={setAssignedToMeFilters}
            title="Tasks Assigned to Me"
          />
          
          <div className="space-y-4">
            {assignedToMe.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No tasks have been assigned to you yet.</p>
                </CardContent>
              </Card>
            ) : filteredAssignedToMe.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No tasks match your current filters.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Showing 0 of {assignedToMe.length} total tasks
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {filteredAssignedToMe.length} of {assignedToMe.length} tasks
                  </p>
                </div>
                {filteredAssignedToMe.map((task: Task) => (
                  <TaskCard key={task.id} task={task} showActions={true} />
                ))}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assigned-by-me" className="mt-6">
          <TaskFilters 
            filters={tasksIAssignedFilters}
            onFiltersChange={setTasksIAssignedFilters}
            title="Tasks I Assigned"
          />
          
          <div className="space-y-4">
            {assignedByMe.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">You haven't assigned any tasks yet.</p>
                </CardContent>
              </Card>
            ) : filteredTasksIAssigned.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No tasks match your current filters.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Showing 0 of {assignedByMe.length} total tasks
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {filteredTasksIAssigned.length} of {assignedByMe.length} tasks
                  </p>
                </div>
                {filteredTasksIAssigned.map((task: Task) => (
                  <TaskCard key={task.id} task={task} showActions={false} />
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Completion Status Dialog */}
      {showCompletionDialog && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Task Status</CardTitle>
              <CardDescription>
                Please provide your feedback on task completion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="completion-status">Task Status *</Label>
                <select
                  id="completion-status"
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value as "complete" | "incomplete" | "")}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select status...</option>
                  <option value="complete">Complete - Task finished successfully</option>
                  <option value="incomplete">Incomplete - Task not finished or had issues</option>
                </select>
              </div>
              <div>
                <Label htmlFor="completion-comment">Closing Remarks *</Label>
                <Textarea
                  id="completion-comment"
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  placeholder="Please provide details about how the task went, any issues encountered, or additional notes..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (completionComment.trim() && completionStatus) {
                      completeTaskMutation.mutate({ 
                        taskId: selectedTask.id, 
                        status: completionStatus,
                        comment: completionComment.trim() 
                      });
                    } else {
                      toast({
                        title: "Required Fields",
                        description: "Please select a status and provide closing remarks.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={completeTaskMutation.isPending || !completionComment.trim() || !completionStatus}
                  className="flex-1"
                >
                  {completeTaskMutation.isPending ? "Updating..." : "Update Task"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompletionDialog(false);
                    setSelectedTask(null);
                    setCompletionComment("");
                    setCompletionStatus("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection Comment Dialog */}
      {selectedTask && !showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Task</CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejection-comment">Rejection Reason *</Label>
                <Textarea
                  id="rejection-comment"
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Please explain why you cannot accept this task..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (rejectionComment.trim()) {
                      rejectTaskMutation.mutate({ 
                        taskId: selectedTask.id, 
                        comment: rejectionComment.trim() 
                      });
                    } else {
                      toast({
                        title: "Comment Required",
                        description: "Please provide a reason for rejection.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={rejectTaskMutation.isPending || !rejectionComment.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {rejectTaskMutation.isPending ? "Rejecting..." : "Reject Task"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(null);
                    setRejectionComment("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </Layout>
  );
}
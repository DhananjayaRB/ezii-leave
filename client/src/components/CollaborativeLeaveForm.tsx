import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, Plus, Trash2, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";

const taskSchema = z.object({
  assigneeName: z.string().min(1, "Assignee name is required"),
  assigneeUserId: z.string().min(1, "Assignee user ID is required"),
  assigneeEmail: z.string().email("Valid email is required"),
  assigneePhone: z.string().optional(),
  taskDescription: z.string().min(10, "Task description must be at least 10 characters"),
  expectedSupportDateFrom: z.date(),
  expectedSupportDateTo: z.date(),
  additionalNotes: z.string().optional(),
});

const collaborativeLeaveSchema = z.object({
  tasks: z.array(taskSchema).min(1, "At least one task is required"),
});

type TaskFormData = z.infer<typeof taskSchema>;
type CollaborativeLeaveFormData = z.infer<typeof collaborativeLeaveSchema>;

interface CollaborativeLeaveFormProps {
  leaveRequestId?: number;
  maxTasks?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  onTasksChange?: (tasks: any[]) => void;
}

export default function CollaborativeLeaveForm({
  leaveRequestId,
  maxTasks,
  onSuccess,
  onCancel,
  className,
  onTasksChange,
}: CollaborativeLeaveFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use external employee data (same as LeaveApplications page)
  const { employees: externalEmployees, loading: employeesLoading } = useExternalEmployeeData();

  const [tasks, setTasks] = useState<TaskFormData[]>([
    {
      assigneeName: "",
      assigneeUserId: "",
      assigneeEmail: "",
      assigneePhone: "",
      taskDescription: "",
      expectedSupportDateFrom: new Date(),
      expectedSupportDateTo: new Date(),
      additionalNotes: "",
    },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CollaborativeLeaveFormData>({
    resolver: zodResolver(collaborativeLeaveSchema),
    defaultValues: { tasks },
  });

  const createTasksMutation = useMutation({
    mutationFn: async (taskData: TaskFormData[]) => {
      const formattedTasks = taskData.map(task => ({
        ...task,
        expectedSupportDateFrom: task.expectedSupportDateFrom.toISOString().split('T')[0],
        expectedSupportDateTo: task.expectedSupportDateTo.toISOString().split('T')[0],
        notificationMethod: "email", // Always email
        assigneeUserId: task.assigneeUserId // Store user_id for task assignment
      }));
      console.log("🚀 Submitting tasks with assigneeUserId:", formattedTasks.map(t => ({ name: t.assigneeName, userId: t.assigneeUserId })));
      console.log("🚀 Full task payload:", formattedTasks);
      
      return await apiRequest('POST', `/api/leave-requests/${leaveRequestId}/tasks`, {
        tasks: formattedTasks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leave-requests/${leaveRequestId}/tasks`] });
      toast({
        title: "Tasks Created",
        description: "All task assignments have been created successfully.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task assignments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addTask = () => {
    // Remove task limit - allow unlimited tasks
    const newTasks = [...tasks, {
      assigneeName: "",
      assigneeUserId: "",
      assigneeEmail: "",
      assigneePhone: "",
      taskDescription: "",
      expectedSupportDateFrom: new Date(),
      expectedSupportDateTo: new Date(),
      additionalNotes: "",
    }];
    setTasks(newTasks);
    setValue("tasks", newTasks);
    onTasksChange?.(newTasks);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
      setValue("tasks", newTasks);
      onTasksChange?.(newTasks);
    }
  };

  const updateTask = (index: number, field: keyof TaskFormData, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
    setValue("tasks", newTasks);
    onTasksChange?.(newTasks);
  };

  const onSubmit = (data: CollaborativeLeaveFormData) => {
    createTasksMutation.mutate(data.tasks);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center space-x-3">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Collaborative Leave Setup</h2>
          <p className="text-gray-600">Assign tasks to colleagues to ensure smooth operations during your leave</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {tasks.map((task, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Task Assignment {index + 1}</CardTitle>
                {tasks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTask(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardDescription>
                Specify who will handle this task and how they should be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assignee Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`assigneeName-${index}`}>Assignee Name *</Label>

                  {employeesLoading ? (
                    <Input
                      disabled
                      value="Loading employees..."
                      placeholder="Loading employees..."
                    />
                  ) : (
                    <Select
                      key={`select-${index}-${task.assigneeUserId}`}
                      value={task.assigneeUserId || ""}
                      onValueChange={(userId) => {
                        console.log("🔵 Select onValueChange triggered with userId:", userId);
                        console.log("🔵 Current task state:", task);
                        const selectedEmployee = externalEmployees.find((emp: any) => 
                          String(emp.user_id) === String(userId)
                        );
                        console.log("🔵 Found employee:", selectedEmployee);
                        if (selectedEmployee) {
                          const updatedData = {
                            assigneeUserId: String(userId),
                            assigneeName: selectedEmployee.user_name || `Employee ${userId}`,
                            assigneeEmail: selectedEmployee.email || ""
                          };
                          console.log("🔵 Updating task with:", updatedData);
                          // Update the local state
                          const newTasks = [...tasks];
                          newTasks[index] = { 
                            ...newTasks[index], 
                            assigneeUserId: updatedData.assigneeUserId,
                            assigneeName: updatedData.assigneeName,
                            assigneeEmail: updatedData.assigneeEmail
                          };
                          setTasks(newTasks);
                          setValue("tasks", newTasks);
                          onTasksChange?.(newTasks);
                          console.log("🔵 State updated successfully");
                        }
                      }}
                    >
                      <SelectTrigger className={errors.tasks?.[index]?.assigneeName ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a colleague" />
                      </SelectTrigger>
                      <SelectContent>
                        {externalEmployees.map((employee: any) => {
                          const displayName = employee.user_name || `Employee ${employee.user_id}`;
                          const employeeNumber = employee.employee_number ? ` (${employee.employee_number})` : '';
                          return (
                            <SelectItem 
                              key={employee.user_id} 
                              value={String(employee.user_id)}
                            >
                              {displayName}{employeeNumber}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.tasks?.[index]?.assigneeName && (
                    <p className="text-sm text-red-500">{errors.tasks[index].assigneeName?.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`assigneeEmail-${index}`}>Email Address *</Label>
                  <Input
                    id={`assigneeEmail-${index}`}
                    type="email"
                    value={task.assigneeEmail}
                    onChange={(e) => updateTask(index, "assigneeEmail", e.target.value)}
                    placeholder="colleague@company.com"
                    className={errors.tasks?.[index]?.assigneeEmail ? "border-red-500" : ""}
                  />
                  {errors.tasks?.[index]?.assigneeEmail && (
                    <p className="text-sm text-red-500">{errors.tasks[index].assigneeEmail?.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`assigneePhone-${index}`}>Phone Number (Optional)</Label>
                <Input
                  id={`assigneePhone-${index}`}
                  value={task.assigneePhone}
                  onChange={(e) => updateTask(index, "assigneePhone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Task Details */}
              <div className="space-y-2">
                <Label htmlFor={`taskDescription-${index}`}>Task Description *</Label>
                <Textarea
                  id={`taskDescription-${index}`}
                  value={task.taskDescription}
                  onChange={(e) => updateTask(index, "taskDescription", e.target.value)}
                  placeholder="Describe what needs to be done, include any specific instructions, deadlines, or important details..."
                  rows={4}
                  className={errors.tasks?.[index]?.taskDescription ? "border-red-500" : ""}
                />
                {errors.tasks?.[index]?.taskDescription && (
                  <p className="text-sm text-red-500">{errors.tasks[index].taskDescription?.message}</p>
                )}
              </div>

              {/* Expected Support Date Range */}
              <div className="space-y-2">
                <Label>Expected Support Date Range *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !task.expectedSupportDateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {task.expectedSupportDateFrom ? format(task.expectedSupportDateFrom, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={task.expectedSupportDateFrom}
                          onSelect={(date) => date && updateTask(index, "expectedSupportDateFrom", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !task.expectedSupportDateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {task.expectedSupportDateTo ? format(task.expectedSupportDateTo, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={task.expectedSupportDateTo}
                          onSelect={(date) => date && updateTask(index, "expectedSupportDateTo", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor={`additionalNotes-${index}`}>Additional Notes (Optional)</Label>
                <Textarea
                  id={`additionalNotes-${index}`}
                  value={task.additionalNotes}
                  onChange={(e) => updateTask(index, "additionalNotes", e.target.value)}
                  placeholder="Any additional information, special instructions, or context for this task..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Task Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addTask}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Task Assignment
        </Button>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createTasksMutation.isPending}
            className="px-8"
          >
            {createTasksMutation.isPending ? "Creating Tasks..." : "Create Task Assignments"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { CollaborativeLeaveForm };
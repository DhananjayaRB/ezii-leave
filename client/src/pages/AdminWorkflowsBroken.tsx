import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Users, Settings, Trash2, Search, Filter, X } from "lucide-react";

// Schema for workflow creation
const workflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  process: z.string().min(1, "Process selection is required"),
  subProcess: z.string().min(1, "Sub-process selection is required"),
  reviewSteps: z.array(z.object({
    title: z.string().min(1, "Review step title is required"),
    roleIds: z.array(z.number()).min(1, "At least one role must be assigned"),
    autoApproval: z.boolean().default(false)
  })).min(1, "At least one review step is required")
});

type WorkflowForm = z.infer<typeof workflowSchema>;

interface ReviewStep {
  id: string;
  title: string;
  roleIds: number[];
  autoApproval: boolean;
}

interface Role {
  id: number;
  name: string;
}

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (roleIds: number[]) => void;
  selectedRoleIds: number[];
}

// Assign Roles Dialog Component will be defined at the end of the file

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Assign to Roles
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for roles"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>

          {/* Roles List */}
          <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              <div className="font-medium text-sm text-gray-700 pb-2 border-b">
                Roles
              </div>
              {filteredRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={role.id.toString()}
                    checked={tempSelectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <label htmlFor={role.id.toString()} className="text-sm cursor-pointer flex-1">
                    {role.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-gray-600">
              ({tempSelectedRoles.length}) Roles selected
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClear}>
                Clear Selection
              </Button>
              <Button onClick={handleAssign} className="bg-teal-600 hover:bg-teal-700">
                Assign to Roles ✓
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminWorkflows() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reviewSteps, setReviewSteps] = useState<ReviewStep[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);

  const form = useForm<WorkflowForm>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      effectiveDate: "",
      process: "",
      subProcess: "",
      reviewSteps: []
    }
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: WorkflowForm) => {
      const orgId = localStorage.getItem('org_id') || '60';
      return apiRequest("POST", "/api/workflows", { ...data, orgId: parseInt(orgId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setReviewSteps([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow",
        variant: "destructive",
      });
    },
  });

  const addReviewStep = () => {
    const newStep: ReviewStep = {
      id: Date.now().toString(),
      title: "",
      roleIds: [],
      autoApproval: false
    };
    setReviewSteps(prev => [...prev, newStep]);
  };

  const removeReviewStep = (stepId: string) => {
    setReviewSteps(prev => prev.filter(step => step.id !== stepId));
  };

  const updateReviewStep = (stepId: string, updates: Partial<ReviewStep>) => {
    setReviewSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    );
  };

  const handleAssignRoles = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
    setAssignDialogOpen(true);
  };

  const handleRoleAssignment = (roleIds: number[]) => {
    if (currentStepIndex !== null) {
      const step = reviewSteps[currentStepIndex];
      updateReviewStep(step.id, { roleIds });
    }
  };

  const openAssignRolesDialog = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
    setAssignDialogOpen(true);
  };

  const onSubmit = (data: WorkflowForm) => {
    const formData = {
      ...data,
      reviewSteps: reviewSteps.map(step => ({
        title: step.title,
        roleIds: step.roleIds,
        autoApproval: step.autoApproval
      }))
    };
    createWorkflowMutation.mutate(formData);
  };

  const getRoleNames = (roleIds: number[]) => {
    return roleIds.map(id => roles.find(role => role.id === id)?.name || id.toString()).join(", ");
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
            <p className="text-gray-600 mt-1">
              Manage approval workflows for your organization
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">New Workflow</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Workflow Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="eg. Leave Approval for Factory Employees" 
                              {...field}
                              className="mt-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Effective Date</FormLabel>
                          <FormControl>
                            <div className="relative mt-1">
                              <Input 
                                type="date" 
                                placeholder="Pick a date"
                                {...field}
                                className="pl-10"
                              />
                              <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="process"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Select Process</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select Process" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="leave-approval">Leave Approval</SelectItem>
                                <SelectItem value="expense-approval">Expense Approval</SelectItem>
                                <SelectItem value="timesheet-approval">Timesheet Approval</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subProcess"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Select sub-process</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select sub-process" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="casual-leave">Casual Leave</SelectItem>
                                <SelectItem value="medical-leave">Medical Leave</SelectItem>
                                <SelectItem value="annual-leave">Annual Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Review Steps Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Review Steps</h3>
                    
                    {/* Workflow Visual Flow */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="space-y-6">
                        {/* Start Step */}
                        <div className="flex items-start space-x-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                            <div className="w-px h-12 bg-gray-300 mt-2"></div>
                          </div>
                          <div className="flex-1 bg-white p-4 rounded border border-gray-200">
                            <div className="text-sm font-medium text-teal-600 mb-1">Start</div>
                            <div className="text-base font-medium text-gray-900">Workflow Name</div>
                          </div>
                        </div>

                        {/* Review Steps */}
                        {reviewSteps.map((step, index) => (
                          <div key={step.id} className="flex items-start space-x-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                              {index < reviewSteps.length - 1 && (
                                <div className="w-px h-12 bg-gray-300 mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1 bg-white p-4 rounded border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-medium text-orange-600 mb-1">Review {index + 1}</div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeReviewStep(step.id)}
                                  className="text-orange-400 hover:text-orange-600 h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                                  <Input
                                    placeholder="eg. Leave Approval for Factory Employees"
                                    value={step.title}
                                    onChange={(e) => updateReviewStep(step.id, { title: e.target.value })}
                                    className="text-sm"
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAssignRoles(index)}
                                    className="text-teal-600 border-teal-600 hover:bg-teal-50 text-sm px-3 py-1"
                                  >
                                    Assign Roles
                                  </Button>
                                  
                                  <div className="flex items-center space-x-3">
                                    {step.roleIds.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {step.roleIds.map(roleId => {
                                          const role = roles.find(r => r.id === roleId);
                                          return role ? (
                                            <Badge key={roleId} variant="secondary" className="text-xs">
                                              {role.name}
                                            </Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm text-gray-600">Forward to the next review</label>
                                      <Checkbox
                                        checked={!step.autoApproval}
                                        onCheckedChange={(checked) => 
                                          updateReviewStep(step.id, { autoApproval: !Boolean(checked) })
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {index === reviewSteps.length - 1 && (
                                  <div className="flex items-center space-x-2 pt-2">
                                    <label className="text-sm text-gray-600">Auto Approval</label>
                                    <Checkbox
                                      checked={step.autoApproval}
                                      onCheckedChange={(checked) => 
                                        updateReviewStep(step.id, { autoApproval: Boolean(checked) })
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Review Step Button */}
                        <div className="flex items-start space-x-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addReviewStep}
                            className="text-teal-600 border-teal-600 hover:bg-teal-50 border-dashed"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Review Step
                          </Button>
                        </div>

                        {/* Finish Step */}
                        {reviewSteps.length > 0 && (
                          <div className="flex items-start space-x-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                            </div>
                            <div className="flex-1 bg-white p-4 rounded border border-gray-200">
                              <div className="text-sm font-medium text-teal-600 mb-1">Finish</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Discard
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createWorkflowMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Workflows */}
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows created yet</h3>
                <p className="text-gray-600 mb-4">Create your first workflow to manage approval processes</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            workflows.map((workflow: any) => (
              <Card key={workflow.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{workflow.name}</h3>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    </div>
                    <Badge variant={workflow.isActive ? "default" : "secondary"}>
                      {workflow.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Assign Roles Dialog */}
        <AssignRolesDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          onAssign={handleRoleAssignment}
          selectedRoleIds={currentStepIndex !== null ? reviewSteps[currentStepIndex]?.roleIds || [] : []}
        />
      </div>
    </Layout>
  );
}

// Assign Roles Dialog Component
interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (roleIds: number[]) => void;
  selectedRoleIds: number[];
}

function AssignRolesDialog({ open, onOpenChange, onAssign, selectedRoleIds }: AssignRolesDialogProps) {
  const [tempSelectedRoles, setTempSelectedRoles] = useState<number[]>(selectedRoleIds);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = () => {
    onAssign(tempSelectedRoles);
    onOpenChange(false);
  };

  const toggleRole = (roleId: number) => {
    setTempSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredRoles.map((role) => (
              <div key={role.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                <Checkbox
                  checked={tempSelectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{role.name}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign}>
              Assign ({tempSelectedRoles.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
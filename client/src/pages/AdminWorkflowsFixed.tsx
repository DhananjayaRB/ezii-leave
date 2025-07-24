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
  subProcess: z.string().min(1, "Sub-process selection is required")
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

function AssignRolesDialog({ open, onOpenChange, onAssign, selectedRoleIds }: AssignRolesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedRoles, setTempSelectedRoles] = useState<number[]>(selectedRoleIds);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleToggle = (roleId: number) => {
    setTempSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleAssign = () => {
    onAssign(tempSelectedRoles);
    onOpenChange(false);
  };

  const handleClear = () => {
    setTempSelectedRoles([]);
  };

  // Update temp selection when selectedRoleIds changes
  useState(() => {
    setTempSelectedRoles(selectedRoleIds);
  });

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
                    id={`role-${role.id}`}
                    checked={tempSelectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer flex-1">
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
      subProcess: ""
    }
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/workflows", data);
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

  const onSubmit = (data: WorkflowForm) => {
    // Convert reviewSteps to the database format
    const steps = reviewSteps.map(step => ({
      title: step.title,
      roleIds: step.roleIds,
      autoApproval: step.autoApproval
    }));
    
    const formData = {
      name: data.name,
      description: `${data.process} - ${data.subProcess}`,
      steps: steps,
      isActive: true,
      orgId: parseInt(localStorage.getItem('org_id') || '60')
    };
    
    createWorkflowMutation.mutate(formData);
  };

  const getRoleNames = (roleIds: number[]) => {
    return roleIds.map(id => roles.find(role => role.id === id)?.name || `Role ${id}`).join(", ");
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Workflow</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workflow Name</FormLabel>
                          <FormControl>
                            <Input placeholder="eg. Leave Approval for Factory Employees" {...field} />
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
                          <FormLabel>Effective Date</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="date" {...field} />
                              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Process Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="process"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Process</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Process" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="application">Application</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subProcess"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select sub-process</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub-process" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apply_for_leave">Apply for Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Review Steps */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Review Steps</h3>
                    
                    {/* Workflow Visualization */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-4 overflow-x-auto">
                        {/* Start */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-600 mt-1">Start</span>
                        </div>
                        
                        {/* Workflow Name Step */}
                        {reviewSteps.length > 0 && (
                          <>
                            <div className="w-4 h-px bg-gray-300 flex-shrink-0"></div>
                            <div className="flex-shrink-0 bg-white border rounded-lg p-3 min-w-[150px]">
                              <div className="font-medium text-sm">Workflow Name</div>
                            </div>
                          </>
                        )}
                        
                        {/* Review Steps */}
                        {reviewSteps.map((step, index) => (
                          <div key={step.id} className="flex items-center space-x-4 flex-shrink-0">
                            <div className="w-4 h-px bg-gray-300"></div>
                            <div className="bg-white border rounded-lg p-3 min-w-[200px]">
                              <div className="space-y-2">
                                <div className="font-medium text-sm">Review {index + 1}</div>
                                <div className="text-xs text-gray-600">
                                  {step.title || "Untitled Step"}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {step.roleIds.length > 0 ? getRoleNames(step.roleIds) : "No roles assigned"}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAssignRoles(index)}
                                    className="text-xs px-2 py-1 h-6"
                                  >
                                    Assign Roles
                                  </Button>
                                </div>
                                {step.autoApproval && (
                                  <Badge variant="secondary" className="text-xs">Auto Approval</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Finish */}
                        {reviewSteps.length > 0 && (
                          <>
                            <div className="w-4 h-px bg-gray-300 flex-shrink-0"></div>
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-gray-600 mt-1">Finish</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Review Step Forms */}
                    {reviewSteps.map((step, index) => (
                      <Card key={step.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Review {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeReviewStep(step.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input
                                placeholder="eg. Leave Approval for Factory Employees"
                                value={step.title}
                                onChange={(e) => updateReviewStep(step.id, { title: e.target.value })}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`auto-approval-${step.id}`}
                                checked={step.autoApproval}
                                onCheckedChange={(checked) => 
                                  updateReviewStep(step.id, { autoApproval: !!checked })
                                }
                              />
                              <label htmlFor={`auto-approval-${step.id}`} className="text-sm">
                                Auto Approval
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Add Review Step Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addReviewStep}
                      className="w-full border-dashed border-2 py-6 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Review Step
                    </Button>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createWorkflowMutation.isPending || reviewSteps.length === 0 || reviewSteps.some(step => !step.title || step.roleIds.length === 0)}
                      className="bg-blue-600 hover:bg-blue-700"
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
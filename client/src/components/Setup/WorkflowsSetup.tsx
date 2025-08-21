import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Settings, Trash2, Search, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const workflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  process: z.string().min(1, "Process is required"),
  subProcesses: z.array(z.string()).min(1, "At least one sub-process is required"),
  reviewSteps: z.array(z.object({
    title: z.string(),
    roleIds: z.array(z.number()),
    autoApproval: z.boolean()
  })).optional()
});

type WorkflowForm = z.infer<typeof workflowSchema>;

interface ReviewStep {
  id: string;
  title: string;
  roleIds: number[];
  autoApproval: boolean;
  days?: number;
  hours?: number;
}

interface Role {
  id: number;
  name: string;
}

interface WorkflowsSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete?: () => void;
  isLast?: boolean;
  isLoading?: boolean;
}

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

          {filteredRoles.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No roles available. Please create roles first.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={tempSelectedRoles.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    {role.name}
                  </Label>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign}>
              Assign Roles
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowsSetup({ onNext, onPrevious, onComplete, isLast, isLoading }: WorkflowsSetupProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reviewSteps, setReviewSteps] = useState<ReviewStep[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  const form = useForm<WorkflowForm>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      effectiveDate: "",
      process: "",
      subProcesses: [],
      reviewSteps: []
    }
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: company } = useQuery<{effectiveDate?: string} | null>({
    queryKey: ["/api/company"],
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (editingWorkflow && isCreateDialogOpen) {
      console.log("Editing workflow data:", editingWorkflow);
      
      const formValues = {
        name: editingWorkflow.name || "",
        effectiveDate: editingWorkflow.effectiveDate ? new Date(editingWorkflow.effectiveDate).toISOString().split('T')[0] : "",
        process: editingWorkflow.process || "application",
        subProcesses: editingWorkflow.subProcesses ? (Array.isArray(editingWorkflow.subProcesses) ? editingWorkflow.subProcesses : [editingWorkflow.subProcess || "apply-leave"]) : ["apply-leave"]
      };
      
      console.log("Form values being set:", formValues);
      form.reset(formValues);
      
      // Set review steps if they exist
      if (editingWorkflow.steps && Array.isArray(editingWorkflow.steps)) {
        const steps = editingWorkflow.steps.map((step: any, index: number) => ({
          id: step.id || Date.now().toString() + index,
          title: step.title || "",
          roleIds: step.roleIds || [],
          autoApproval: step.autoApproval || false,
          days: step.days || 0,
          hours: step.hours || 0
        }));
        setReviewSteps(steps);
      } else {
        setReviewSteps([]);
      }
    }
  }, [editingWorkflow, isCreateDialogOpen, form]);

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

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WorkflowForm }) => {
      return apiRequest("PATCH", `/api/workflows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setIsCreateDialogOpen(false);
      setEditingWorkflow(null);
      form.reset();
      setReviewSteps([]);
      toast({
        title: "Success",
        description: "Workflow updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow",
        variant: "destructive",
      });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return apiRequest("DELETE", `/api/workflows/${workflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });

  const addReviewStep = () => {
    const newStep: ReviewStep = {
      id: Date.now().toString(),
      title: "",
      roleIds: [],
      autoApproval: false,
      days: 0,
      hours: 0
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
    console.log("[handleAssignRoles] stepIndex:", stepIndex, "reviewSteps:", reviewSteps);
    console.log("[handleAssignRoles] step roleIds:", reviewSteps[stepIndex]?.roleIds);
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
    console.log("[openAssignRolesDialog] Opening for step:", stepIndex);
    console.log("[openAssignRolesDialog] Current reviewSteps:", reviewSteps);
    console.log("[openAssignRolesDialog] Step roleIds:", reviewSteps[stepIndex]?.roleIds);
    setCurrentStepIndex(stepIndex);
    setAssignDialogOpen(true);
  };

  const onSubmit = (data: WorkflowForm) => {
    // Validate effective date against company setup date
    if (company?.effectiveDate && data.effectiveDate) {
      const companyDate = new Date(company.effectiveDate);
      const selectedDate = new Date(data.effectiveDate);
      
      if (selectedDate < companyDate) {
        form.setError("effectiveDate", {
          message: "Effective date cannot be before company setup date"
        });
        return;
      }
    }

    const formData = {
      ...data,
      steps: reviewSteps.map(step => ({
        title: step.title,
        roleIds: step.roleIds,
        autoApproval: step.autoApproval,
        days: step.days || 0,
        hours: step.hours || 0
      }))
    };

    if (editingWorkflow) {
      updateWorkflowMutation.mutate({ id: editingWorkflow.id, data: formData });
    } else {
      createWorkflowMutation.mutate(formData);
    }
  };

  const handleEditWorkflow = (workflow: any) => {
    setEditingWorkflow(workflow);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteWorkflow = (workflowId: number) => {
    if (window.confirm("Are you sure you want to delete this workflow?")) {
      deleteWorkflowMutation.mutate(workflowId);
    }
  };

  const getRoleNames = (roleIds: number[]) => {
    return roleIds.map(id => roles.find(role => role.id === id)?.name || id.toString()).join(", ");
  };

  const handleComplete = async () => {
    if (onComplete) {
      await onComplete();
    }
    onNext();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Workflows Setup</h2>
        <p className="text-gray-600 mt-2">
          Create approval workflows to manage your organization's leave requests and compensation processes
        </p>
      </div>

      {/* Existing Workflows */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Workflows</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingWorkflow(null);
              form.reset();
              setReviewSteps([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">{editingWorkflow ? "Edit Workflow" : "New Workflow"}</DialogTitle>
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
                          <FormLabel>Workflow Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter workflow name" {...field} />
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
                          <FormLabel>Effective Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                          <FormLabel>Process *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select process" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="application">Application</SelectItem>
                              <SelectItem value="pto">BTO</SelectItem>
                              <SelectItem value="comp-off">Comp-off</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subProcesses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select sub-process *</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {form.watch("process") === "application" && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="apply-leave"
                                      checked={field.value?.includes("apply-leave") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "apply-leave"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "apply-leave"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="apply-leave" className="text-sm">Apply Leave</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="withdraw-leave"
                                      checked={field.value?.includes("withdraw-leave") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "withdraw-leave"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "withdraw-leave"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="withdraw-leave" className="text-sm">Withdraw Leave</Label>
                                  </div>
                                </>
                              )}
                              {form.watch("process") === "pto" && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="apply-pto"
                                      checked={field.value?.includes("apply-pto") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "apply-pto"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "apply-pto"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="apply-pto" className="text-sm">Apply BTO</Label>
                                  </div>
                                </>
                              )}
                              {form.watch("process") === "comp-off" && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="bank-comp-off"
                                      checked={field.value?.includes("bank-comp-off") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "bank-comp-off"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "bank-comp-off"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="bank-comp-off" className="text-sm">Bank Comp-off</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="avail-comp-off"
                                      checked={field.value?.includes("avail-comp-off") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "avail-comp-off"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "avail-comp-off"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="avail-comp-off" className="text-sm">Avail Comp-off</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="transfer-comp-off"
                                      checked={field.value?.includes("transfer-comp-off") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "transfer-comp-off"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "transfer-comp-off"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="transfer-comp-off" className="text-sm">Transfer to Leaves</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="encash-comp-off"
                                      checked={field.value?.includes("encash-comp-off") || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, "encash-comp-off"]);
                                        } else {
                                          field.onChange(currentValues.filter(v => v !== "encash-comp-off"));
                                        }
                                      }}
                                    />
                                    <Label htmlFor="encash-comp-off" className="text-sm">En-Cash Comp</Label>
                                  </div>
                                </>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Review Steps Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Review Steps</h3>
                        <p className="text-sm text-gray-600">Configure the approval process for this workflow</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addReviewStep}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Step
                      </Button>
                    </div>

                    {/* Review Steps List */}
                    <div className="space-y-4">
                      {reviewSteps.map((step, index) => (
                        <Card key={step.id} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">Review {index + 1}</h4>
                              <Input
                                placeholder="Step title"
                                value={step.title}
                                onChange={(e) => updateReviewStep(step.id, { title: e.target.value })}
                                className="mt-2"
                              />
                            </div>
                            {reviewSteps.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeReviewStep(step.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Assigned Roles</Label>
                              <div className="mt-1 flex items-center gap-2">
                                {step.roleIds.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {step.roleIds.map(roleId => (
                                      <Badge key={roleId} variant="secondary">
                                        {roles.find(r => r.id === roleId)?.name || roleId}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">No roles assigned</span>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAssignRolesDialog(index)}
                                >
                                  Assign Roles
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`auto-approval-${step.id}`}
                                  checked={step.autoApproval}
                                  onCheckedChange={(checked) => 
                                    updateReviewStep(step.id, { autoApproval: checked as boolean })
                                  }
                                />
                                <Label htmlFor={`auto-approval-${step.id}`} className="text-sm">
                                  {index === reviewSteps.length - 1 
                                    ? "Enable auto-approval if all conditions are met"
                                    : "Forward to the next review"
                                  }
                                </Label>
                              </div>
                              
                              {/* Time-based auto-approval fields */}
                              {step.autoApproval && (
                                <div className="ml-6 space-y-2">
                                  <div className="text-xs text-gray-500 font-medium">Auto-approve after:</div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={step.days || ''}
                                        onChange={(e) => updateReviewStep(step.id, { days: parseInt(e.target.value) || 0 })}
                                        className="w-16 h-8 text-xs"
                                      />
                                      <span className="text-xs text-gray-500">days</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="0"
                                        value={step.hours || ''}
                                        onChange={(e) => updateReviewStep(step.id, { hours: parseInt(e.target.value) || 0 })}
                                        className="w-16 h-8 text-xs"
                                      />
                                      <span className="text-xs text-gray-500">hours</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {reviewSteps.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No review steps configured. Add steps to create an approval workflow.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}>
                      {editingWorkflow ? "Update Workflow" : "Create Workflow"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {workflows.length === 0 ? (
          <Card className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows configured</h3>
            <p className="text-gray-600 mb-4">
              Create your first workflow to start managing approval processes
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                      <Badge variant="outline">
                        {workflow.process} - {workflow.subProcess}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Effective from: {new Date(workflow.effectiveDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Review Steps:</h4>
                      {workflow.steps && workflow.steps.length > 0 ? (
                        <div className="grid gap-2">
                          {workflow.steps.map((step: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <span className="font-medium">Step {index + 1}: {step.title || "Untitled Step"}</span>
                                <div className="text-sm text-gray-600">
                                  Roles: {getRoleNames(step.roleIds) || "No roles assigned"}
                                </div>
                              </div>
                              {step.autoApproval && (
                                <Badge variant="secondary">Auto-approval</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No review steps configured</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWorkflow(workflow)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Setup Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-3">
          {workflows.length > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{workflows.length} workflow(s) configured</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleComplete}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLast ? "Complete Setup" : "Next"}
        </Button>
      </div>

      {/* Assign Roles Dialog */}
      <AssignRolesDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleRoleAssignment}
        selectedRoleIds={currentStepIndex !== null ? reviewSteps[currentStepIndex]?.roleIds || [] : []}
      />
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Search, Edit } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedRoles, setTempSelectedRoles] = useState<number[]>(selectedRoleIds);

  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Debug logging
  console.log("AssignRolesDialog - Roles data:", roles);
  console.log("AssignRolesDialog - Roles loading:", rolesLoading);
  console.log("AssignRolesDialog - Roles error:", rolesError);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {rolesLoading ? (
              <div className="text-center py-4 text-gray-500">
                <p>Loading roles...</p>
              </div>
            ) : rolesError ? (
              <div className="text-center py-4 text-red-500">
                <p>Error loading roles: {rolesError.message}</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {roles.length === 0 ? (
                  <div>
                    <p>No roles found.</p>
                    <p className="text-sm mt-1">Please create roles in the Roles setup step first.</p>
                  </div>
                ) : (
                  <p>No roles match your search.</p>
                )}
              </div>
            ) : (
              filteredRoles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={tempSelectedRoles.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <span className="text-sm">{role.name}</span>
                </div>
              ))
            )}
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

export default function WorkflowsSetup({ onNext, onPrevious, onComplete, isLast, isLoading }: WorkflowsSetupProps) {
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState("");
  const [reviewSteps, setReviewSteps] = useState<ReviewStep[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignRolesDialogOpen, setIsAssignRolesDialogOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Mutation to compute leave balances on finish setup
  const computeBalancesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/compute-leave-balances", {});
    },
    onSuccess: () => {
      toast({
        title: "Setup Complete",
        description: "Leave balances computed for all employees.",
      });
      // Call the completion callback if this is the last step
      if (onComplete) {
        onComplete();
      } else {
        onNext();
      }
    },
    onError: (error) => {
      console.error("Error computing leave balances:", error);
      toast({
        title: "Error",
        description: "Failed to compute leave balances. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFinishSetup = () => {
    computeBalancesMutation.mutate();
  };

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      return await apiRequest("POST", "/api/workflows", workflowData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setWorkflowName("");
    setReviewSteps([]);
  };

  const addReviewStep = () => {
    const newStep: ReviewStep = {
      id: Date.now().toString(),
      title: `Review Step ${reviewSteps.length + 1}`,
      roleIds: [],
      autoApproval: false,
    };
    setReviewSteps([...reviewSteps, newStep]);
  };

  const removeReviewStep = (stepId: string) => {
    setReviewSteps(reviewSteps.filter(step => step.id !== stepId));
  };

  const updateStepTitle = (stepId: string, title: string) => {
    setReviewSteps(reviewSteps.map(step => 
      step.id === stepId ? { ...step, title } : step
    ));
  };

  const updateStepAutoApproval = (stepId: string, autoApproval: boolean) => {
    setReviewSteps(reviewSteps.map(step => 
      step.id === stepId ? { ...step, autoApproval } : step
    ));
  };

  const handleAssignRoles = (roleIds: number[]) => {
    if (currentStepIndex !== null) {
      const stepId = reviewSteps[currentStepIndex].id;
      setReviewSteps(reviewSteps.map(step => 
        step.id === stepId ? { ...step, roleIds } : step
      ));
    }
  };

  const createWorkflow = () => {
    if (!workflowName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workflow name.",
        variant: "destructive",
      });
      return;
    }

    const workflowData = {
      name: workflowName,
      description: `Custom workflow with ${reviewSteps.length} review steps`,
      steps: reviewSteps.map((step, index) => ({
        stepNumber: index + 1,
        stepName: step.title,
        roleIds: step.roleIds,
        autoApproval: step.autoApproval,
      })),
      isActive: true,
    };

    createWorkflowMutation.mutate(workflowData);
  };

  const getRoleNames = (roleIds: number[]) => {
    return roleIds.map(id => {
      const role = roles.find(r => r.id === id);
      return role ? role.name : 'Unknown';
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Workflow Configuration</h2>
        <p className="text-gray-600 mt-2">
          Configure approval workflows for different types of requests.
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ml-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">New Workflow</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Workflow Name</label>
                  <Input
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="eg. Leave Approval for Factory Employees"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Effective Date</label>
                  <div className="relative mt-1">
                    <Input 
                      type="date" 
                      placeholder="Pick a date"
                      className="pl-10"
                    />
                    <Calendar className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Select Process</label>
                  <div className="mt-1">
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select Process</option>
                      <option value="leave-approval">Leave Approval</option>
                      <option value="expense-approval">Expense Approval</option>
                      <option value="timesheet-approval">Timesheet Approval</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Select sub-process</label>
                  <div className="mt-1">
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select sub-process</option>
                      <option value="casual-leave">Casual Leave</option>
                      <option value="medical-leave">Medical Leave</option>
                      <option value="annual-leave">Annual Leave</option>
                    </select>
                  </div>
                </div>
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
                                onChange={(e) => updateStepTitle(step.id, e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentStepIndex(index);
                                  setIsAssignRolesDialogOpen(true);
                                }}
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
                                      updateStepAutoApproval(step.id, !Boolean(checked))
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
                                    updateStepAutoApproval(step.id, Boolean(checked))
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
                  onClick={createWorkflow}
                  disabled={createWorkflowMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">
              Create your first workflow to get started with approval processes.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </Card>
        ) : (
          workflows
            .filter((workflow: any) => 
              workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((workflow: any) => (
              <Card key={workflow.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                      <Badge variant={workflow.isActive ? "default" : "secondary"}>
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mt-1">{workflow.description}</p>
                    {workflow.steps && workflow.steps.length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        {workflow.steps.length} review step{workflow.steps.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button 
          onClick={handleFinishSetup}
          disabled={computeBalancesMutation.isPending || isLoading}
        >
          {computeBalancesMutation.isPending ? "Finishing Setup..." : "Complete Setup"}
        </Button>
      </div>

      <AssignRolesDialog
        open={isAssignRolesDialogOpen}
        onOpenChange={setIsAssignRolesDialogOpen}
        onAssign={handleAssignRoles}
        selectedRoleIds={currentStepIndex !== null ? reviewSteps[currentStepIndex]?.roleIds || [] : []}
      />
    </div>
  );
}
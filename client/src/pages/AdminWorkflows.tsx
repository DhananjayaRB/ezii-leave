import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Settings, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";

const workflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  process: z.string().min(1, "Process is required"),
  subProcesses: z
    .array(z.string())
    .min(1, "At least one sub-process is required"),
  reviewSteps: z
    .array(
      z.object({
        title: z.string(),
        roleIds: z.array(z.number()),
        autoApproval: z.boolean(),
      }),
    )
    .optional(),
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

export default function AdminWorkflows() {
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
      reviewSteps: [],
    },
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: company } = useQuery<{ effectiveDate?: string } | null>({
    queryKey: ["/api/company"],
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (editingWorkflow && isCreateDialogOpen) {
      console.log("Editing workflow data:", editingWorkflow);

      const formValues = {
        name: editingWorkflow.name || "",
        effectiveDate: editingWorkflow.effectiveDate
          ? new Date(editingWorkflow.effectiveDate).toISOString().split("T")[0]
          : "",
        process: editingWorkflow.process || "application",
        subProcesses: editingWorkflow.subProcesses
          ? Array.isArray(editingWorkflow.subProcesses)
            ? editingWorkflow.subProcesses
            : [editingWorkflow.subProcess || "apply-leave"]
          : ["apply-leave"],
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
          hours: step.hours || 0,
        }));
        setReviewSteps(steps);
      } else {
        setReviewSteps([]);
      }
    }
  }, [editingWorkflow, isCreateDialogOpen, form]);

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: WorkflowForm) => {
      const orgId = localStorage.getItem("org_id") || "60";
      return apiRequest("POST", "/api/workflows", {
        ...data,
        orgId: parseInt(orgId),
      });
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
      hours: 0,
    };
    setReviewSteps((prev) => [...prev, newStep]);
  };

  const removeReviewStep = (stepId: string) => {
    setReviewSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const updateReviewStep = (stepId: string, updates: Partial<ReviewStep>) => {
    setReviewSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    );
  };

  const handleAssignRoles = (stepIndex: number) => {
    console.log(
      "[handleAssignRoles] stepIndex:",
      stepIndex,
      "reviewSteps:",
      reviewSteps,
    );
    console.log(
      "[handleAssignRoles] step roleIds:",
      reviewSteps[stepIndex]?.roleIds,
    );
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
    console.log(
      "[openAssignRolesDialog] Step roleIds:",
      reviewSteps[stepIndex]?.roleIds,
    );
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
          message: "Effective date cannot be before company setup date",
        });
        return;
      }
    }

    const formData = {
      ...data,
      steps: reviewSteps.map((step) => ({
        title: step.title,
        roleIds: step.roleIds,
        autoApproval: step.autoApproval,
        days: step.days || 0,
        hours: step.hours || 0,
      })),
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
    return roleIds
      .map((id) => roles.find((role) => role.id === id)?.name || id.toString())
      .join(", ");
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
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingWorkflow(null);
                form.reset();
                setReviewSteps([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {editingWorkflow ? "Edit Workflow" : "New Workflow"}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Workflow Name
                          </FormLabel>
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
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Effective Date
                          </FormLabel>
                          <FormControl>
                            <div className="relative mt-1">
                              <Input
                                type="date"
                                placeholder="Pick a date"
                                {...field}
                                min={
                                  company?.effectiveDate
                                    ? new Date(company.effectiveDate)
                                        .toISOString()
                                        .split("T")[0]
                                    : undefined
                                }
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
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Select Process
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select Process" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="application">
                                  Application
                                </SelectItem>
                                <SelectItem value="pto">BTO</SelectItem>
                                <SelectItem value="comp-off">
                                  Comp-off
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subProcesses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Select sub-process
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {form.watch("process") === "application" && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="apply-leave"
                                      checked={
                                        field.value?.includes("apply-leave") ||
                                        false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "apply-leave",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "apply-leave",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="apply-leave"
                                      className="text-sm"
                                    >
                                      Apply Leave
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="withdraw-leave"
                                      checked={
                                        field.value?.includes(
                                          "withdraw-leave",
                                        ) || false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "withdraw-leave",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "withdraw-leave",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="withdraw-leave"
                                      className="text-sm"
                                    >
                                      Withdraw Leave
                                    </Label>
                                  </div>
                                </>
                              )}
                              {form.watch("process") === "pto" && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="apply-pto"
                                    checked={
                                      field.value?.includes("apply-pto") ||
                                      false
                                    }
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        field.onChange([
                                          ...currentValues,
                                          "apply-pto",
                                        ]);
                                      } else {
                                        field.onChange(
                                          currentValues.filter(
                                            (v) => v !== "apply-pto",
                                          ),
                                        );
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor="apply-pto"
                                    className="text-sm"
                                  >
                                    Apply BTO
                                  </Label>
                                </div>
                              )}
                              {form.watch("process") === "comp-off" && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="bank-comp-off"
                                      checked={
                                        field.value?.includes(
                                          "bank-comp-off",
                                        ) || false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "bank-comp-off",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "bank-comp-off",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="bank-comp-off"
                                      className="text-sm"
                                    >
                                      Bank Comp-off
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="avail-comp-off"
                                      checked={
                                        field.value?.includes(
                                          "avail-comp-off",
                                        ) || false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "avail-comp-off",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "avail-comp-off",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="avail-comp-off"
                                      className="text-sm"
                                    >
                                      Avail Comp-off
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="transfer-comp-off"
                                      checked={
                                        field.value?.includes(
                                          "transfer-comp-off",
                                        ) || false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "transfer-comp-off",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "transfer-comp-off",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="transfer-comp-off"
                                      className="text-sm"
                                    >
                                      Transfer to Leaves
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="encash-comp-off"
                                      checked={
                                        field.value?.includes(
                                          "encash-comp-off",
                                        ) || false
                                      }
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([
                                            ...currentValues,
                                            "encash-comp-off",
                                          ]);
                                        } else {
                                          field.onChange(
                                            currentValues.filter(
                                              (v) => v !== "encash-comp-off",
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor="encash-comp-off"
                                      className="text-sm"
                                    >
                                      En-Cash Comp
                                    </Label>
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
                    <h3 className="text-lg font-medium text-gray-900">
                      Review Steps
                    </h3>

                    {/* Vertical Workflow Flow */}
                    <div
                      className="bg-gray-50 p-6 rounded-lg space-y-4"
                      key="workflow-flow-updated"
                    >
                      {/* Workflow Name Box */}
                      <div className="bg-white px-4 py-2 rounded border border-gray-200 text-center">
                        <div className="text-sm font-medium text-gray-700">
                          Workflow Name
                        </div>
                      </div>

                      {/* Review Steps Vertically */}
                      {reviewSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="text-sm font-medium text-gray-900 mb-3">
                            Review {index + 1}
                          </div>

                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <Input
                              placeholder="eg. Leave Approval for Factory Employees"
                              value={step.title}
                              onChange={(e) =>
                                updateReviewStep(step.id, {
                                  title: e.target.value,
                                })
                              }
                              className="text-sm"
                            />
                          </div>

                          <div className="text-xs text-gray-400 mb-3">
                            {step.roleIds.length === 0
                              ? "No roles assigned"
                              : `${step.roleIds.length} role(s) assigned`}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignRolesDialog(index)}
                            className="w-full text-teal-600 border-teal-600 hover:bg-teal-50 mb-3"
                          >
                            Assign Roles
                          </Button>

                          {/* Auto-approval checkbox - conditional text based on step position */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`auto-approval-${step.id}`}
                                checked={step.autoApproval}
                                onCheckedChange={(checked) =>
                                  updateReviewStep(step.id, {
                                    autoApproval: !!checked,
                                  })
                                }
                              />
                              <Label
                                htmlFor={`auto-approval-${step.id}`}
                                className="text-xs"
                              >
                                {index === reviewSteps.length - 1
                                  ? "Enable auto-approval if all conditions are met"
                                  : "Forward to the next review"}
                              </Label>
                            </div>

                            {/* Time-based auto-approval fields */}
                            {step.autoApproval && (
                              <div className="ml-6 space-y-2">
                                <div className="text-xs text-gray-500 font-medium">
                                  Auto-approve after:
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={step.days || ""}
                                      onChange={(e) =>
                                        updateReviewStep(step.id, {
                                          days: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-16 h-8 text-xs"
                                    />
                                    <span className="text-xs text-gray-500">
                                      days
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="23"
                                      placeholder="0"
                                      value={step.hours || ""}
                                      onChange={(e) =>
                                        updateReviewStep(step.id, {
                                          hours: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-16 h-8 text-xs"
                                    />
                                    <span className="text-xs text-gray-500">
                                      hours
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Review Step Button */}
                    <div className="flex justify-center">
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
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createWorkflowMutation.isPending ||
                        updateWorkflowMutation.isPending
                      }
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {editingWorkflow
                        ? updateWorkflowMutation.isPending
                          ? "Updating..."
                          : "Update Workflow"
                        : createWorkflowMutation.isPending
                          ? "Creating..."
                          : "Create Workflow"}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No workflows created yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first workflow to manage approval processes
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
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
                    <div className="flex-1">
                      <h3 className="font-medium">{workflow.name}</h3>
                      <p className="text-sm text-gray-600">
                        {workflow.description}
                      </p>
                      <div className="text-xs text-gray-500 mt-1">
                        Process: {workflow.process} | Sub-process:{" "}
                        {workflow.subProcess}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={workflow.isActive ? "default" : "secondary"}
                      >
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkflow(workflow)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteWorkflowMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
          selectedRoleIds={
            currentStepIndex !== null
              ? reviewSteps[currentStepIndex]?.roleIds || []
              : []
          }
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

function AssignRolesDialog({
  open,
  onOpenChange,
  onAssign,
  selectedRoleIds,
}: AssignRolesDialogProps) {
  const [tempSelectedRoles, setTempSelectedRoles] =
    useState<number[]>(selectedRoleIds);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync tempSelectedRoles with selectedRoleIds prop when it changes
  useEffect(() => {
    console.log(
      "[AssignRolesDialog] selectedRoleIds prop changed:",
      selectedRoleIds,
    );
    console.log(
      "[AssignRolesDialog] typeof selectedRoleIds:",
      typeof selectedRoleIds,
    );
    console.log(
      "[AssignRolesDialog] Array.isArray(selectedRoleIds):",
      Array.isArray(selectedRoleIds),
    );
    setTempSelectedRoles(selectedRoleIds || []);
  }, [selectedRoleIds]);

  // Reset tempSelectedRoles when dialog opens
  useEffect(() => {
    if (open) {
      console.log(
        "[AssignRolesDialog] Dialog opened, setting tempSelectedRoles to:",
        selectedRoleIds,
      );
      setTempSelectedRoles(selectedRoleIds || []);
    }
  }, [open, selectedRoleIds]);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  console.log("[AssignRolesDialog] Available roles from API:", roles);
  console.log(
    "[AssignRolesDialog] Current tempSelectedRoles:",
    tempSelectedRoles,
  );

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAssign = () => {
    onAssign(tempSelectedRoles);
    onOpenChange(false);
  };

  const toggleRole = (roleId: number) => {
    setTempSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
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
              <div
                key={role.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
              >
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

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Plus, Edit, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmployeeAssignment from "@/components/Setup/EmployeeAssignment";

// PTO Variant form schema
const ptoVariantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  halfDay: z.boolean().default(false),
  quarterDay: z.boolean().default(false),
  hours: z.boolean().default(false),
  workflowRequired: z.boolean().default(false),
  noticePeriodAllowed: z.boolean().default(true),
  documentsRequired: z.boolean().default(false),
  applicableAfterType: z.string().default("date_of_joining"),
  applicableAfter: z.number().min(0).default(0),
  approvalDays: z.number().min(0).default(0),
  minimumHours: z.number().min(0).default(0),
  maxHours: z.number().min(0).default(0),
  maxInstances: z.number().min(0).default(0),
  maxInstancesPeriod: z.string().default("Month"),
  grantingPeriod: z.string().default("Yearly"),
});

type PTOVariantForm = z.infer<typeof ptoVariantSchema>;

interface PTOVariant {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  halfDay: boolean;
  quarterDay: boolean;
  hours: boolean;
  workflowRequired: boolean;
  noticePeriodAllowed: boolean;
  documentsRequired: boolean;
  applicableAfter: number;
  approvalDays: number;
  minimumHours: number;
  maxHours: number;
  maxInstances: number;
  maxInstancesPeriod: string;
  grantingPeriod: string;
  orgId: number;
  createdAt: string;
  updatedAt: string;
}

// PTO Employee Assignment Dialog Component
interface PTOEmployeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId: number;
  onComplete: () => void;
}

function PTOEmployeeAssignmentDialog({
  open,
  onOpenChange,
  variantId,
  onComplete,
}: PTOEmployeeAssignmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);

  // Fetch existing assignments for this PTO variant
  const { data: existingAssignments = [] } = useQuery({
    queryKey: [`/api/employee-assignments/pto/${variantId}`],
    enabled: open && !!variantId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // Employee data from external API
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Load employee data from external API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { fetchEmployeeData, transformEmployeeData } = await import(
          "@/lib/externalApi"
        );
        const employeeData = await fetchEmployeeData();
        const transformedEmployees = employeeData.map(transformEmployeeData);
        setAllEmployees(transformedEmployees);
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    if (open && variantId) {
      loadEmployees();
    }
  }, [open, variantId]);

  // Load assigned employees when variant changes or assignments are fetched
  useEffect(() => {
    if (Array.isArray(existingAssignments) && existingAssignments.length > 0) {
      console.log("PTO Edit - Existing assignments:", existingAssignments);
      console.log("PTO Edit - All employees count:", allEmployees.length);

      if (allEmployees.length > 0) {
        // Try to match with external API employee data
        const assignedUserIds = existingAssignments.map(
          (assignment: any) => assignment.userId,
        );
        const assignedEmployeeData = allEmployees.filter((emp) => {
          const userIdMatch = assignedUserIds.includes(emp.user_id);
          const idMatch = assignedUserIds.includes(emp.id);
          return userIdMatch || idMatch;
        });
        console.log(
          "PTO Edit - Matched employees from external API:",
          assignedEmployeeData,
        );
        setAssignedEmployees(assignedEmployeeData);
      } else {
        // Fallback: Create robust employee objects from assignments when external API fails
        const fallbackEmployees = existingAssignments.map(
          (assignment: any) => ({
            user_id: assignment.userId,
            id: assignment.userId,
            user_name: `Employee ${assignment.userId}`,
            name: `Employee ${assignment.userId}`,
            first_name: "Employee",
            last_name: assignment.userId,
            email: `employee${assignment.userId}@company.com`,
            employeeNumber: assignment.userId,
            designation: "Employee",
            dateOfJoining: new Date().toISOString(),
            userRole: "employee",
            workerType: "regular",
            profilePhoto: null,
            phoneNumber: null,
            dateOfBirth: new Date().toISOString(),
            gender: "Other",
            reportingManager: null,
            leaveId: assignment.userId,
            isDifferentlyAbled: false,
            lastWorkingDay: null,
            employee_number: assignment.userId,
          }),
        );
        console.log("PTO Edit - Using fallback employees:", fallbackEmployees);
        setAssignedEmployees(fallbackEmployees);
      }
    } else if (
      Array.isArray(existingAssignments) &&
      existingAssignments.length === 0
    ) {
      setAssignedEmployees([]);
    }
  }, [existingAssignments, allEmployees, variantId]);

  // Save assignments mutation
  const saveAssignmentsMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      // Delete existing assignments
      if (existingAssignments.length > 0) {
        await Promise.all(
          existingAssignments.map((assignment: any) =>
            apiRequest(`/api/employee-assignments/${assignment.id}`, {
              method: "DELETE",
            }),
          ),
        );
      }

      // Create new assignments using bulk endpoint
      if (employees.length > 0) {
        const assignments = employees.map((employee: any) => ({
          userId: employee.user_id,
          leaveVariantId: variantId,
          assignmentType: "pto_variant",
        }));

        await apiRequest("/api/employee-assignments/bulk", {
          method: "POST",
          body: JSON.stringify(assignments),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-assignments/pto/${variantId}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      toast({
        title: "Success",
        description: "Employee assignments updated successfully",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee assignments",
        variant: "destructive",
      });
    },
  });

  const handleAssign = async (selectedEmployees: any[]) => {
    try {
      const assignments = selectedEmployees.map((emp) => ({
        userId: emp.user_id || emp.id,
        leaveVariantId: variantId,
        assignmentType: "pto_variant",
      }));

      await apiRequest("POST", "/api/employee-assignments/bulk", {
        assignments,
      });

      setAssignedEmployees(selectedEmployees);

      toast({
        title: "Success",
        description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} assigned successfully.`,
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save employee assignments.",
        variant: "destructive",
      });
    }
  };

  // Use the same pattern as CompOffVariantForm - render EmployeeAssignment directly as full-screen overlay
  if (!open) return null;

  return (
    <EmployeeAssignment
      onClose={() => onOpenChange(false)}
      onAssign={handleAssign}
      preSelectedEmployees={assignedEmployees}
      applicableGenders={[]} // PTO variants don't use gender filtering
    />
  );
}

export default function AdminPTOVariants() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<PTOVariant | null>(null);
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [variantAssignments, setVariantAssignments] = useState<
    Record<string, any[]>
  >({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PTO variants
  const { data: ptoVariants = [], isLoading } = useQuery<PTOVariant[]>({
    queryKey: ["/api/pto-variants"],
  });

  // Fetch external employee data
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/external-employees"],
    queryFn: async () => {
      const { fetchEmployeeData, transformEmployeeData } = await import(
        "@/lib/externalApi"
      );
      try {
        const externalEmployees = await fetchEmployeeData();
        return externalEmployees.map(transformEmployeeData);
      } catch (error) {
        console.error("Failed to fetch external employees:", error);
        return [];
      }
    },
  });

  // Load existing employee assignments for all PTO variants
  useEffect(() => {
    if (ptoVariants && ptoVariants.length > 0 && allEmployees.length > 0) {
      const loadAssignments = async () => {
        const assignments: Record<string, any[]> = {};

        for (const variant of ptoVariants) {
          try {
            const response = await fetch(
              `/api/employee-assignments/pto/${variant.id}`,
              {
                credentials: "include",
                headers: {
                  "X-Org-Id": localStorage.getItem("org_id") || "60",
                },
              },
            );
            if (response.ok) {
              const variantAssignments = await response.json();
              if (
                Array.isArray(variantAssignments) &&
                variantAssignments.length > 0
              ) {
                const assignedUserIds = variantAssignments.map(
                  (assignment: any) => assignment.userId,
                );
                const assignedEmployeeData = allEmployees.filter(
                  (emp) =>
                    assignedUserIds.includes(emp.user_id) ||
                    assignedUserIds.includes(emp.id),
                );
                assignments[variant.id] = assignedEmployeeData;
              } else {
                assignments[variant.id] = [];
              }
            }
          } catch (error) {
            console.error(
              `Error loading assignments for PTO variant ${variant.id}:`,
              error,
            );
            assignments[variant.id] = [];
          }
        }

        setVariantAssignments(assignments);
      };

      loadAssignments();
    }
  }, [ptoVariants.length, allEmployees.length]);

  // Form setup
  const form = useForm<PTOVariantForm>({
    resolver: zodResolver(ptoVariantSchema),
    defaultValues: {
      name: "",
      description: "",
      enabled: true,
      halfDay: false,
      quarterDay: false,
      hours: false,
      workflowRequired: false,
      noticePeriodAllowed: true,
      documentsRequired: false,
      applicableAfterType: "date_of_joining",
      applicableAfter: 0,
      approvalDays: 0,
      minimumHours: 0,
      maxHours: 0,
      maxInstances: 0,
      maxInstancesPeriod: "Month",
      grantingPeriod: "Yearly",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PTOVariantForm) => {
      return await apiRequest("/api/pto-variants", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      setShowDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "PTO variant created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create PTO variant",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PTOVariantForm) => {
      if (!editingVariant) throw new Error("No variant to update");
      return await apiRequest(`/api/pto-variants/${editingVariant.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      setShowDialog(false);
      setEditingVariant(null);
      form.reset();
      toast({
        title: "Success",
        description: "PTO variant updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update PTO variant",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/pto-variants/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      toast({
        title: "Success",
        description: "PTO variant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete PTO variant",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PTOVariantForm) => {
    console.log("PTO Variant Submit - Form data:", data);
    console.log("PTO Variant Submit - Time units:", {
      halfDay: data.halfDay,
      quarterDay: data.quarterDay,
      hours: data.hours,
    });

    if (editingVariant) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (variant: PTOVariant) => {
    console.log("PTO Variant Edit - Current variant data:", variant);
    setEditingVariant(variant);

    const formData = {
      name: variant.name,
      description: variant.description || "",
      enabled: variant.enabled,
      halfDay: variant.halfDay,
      quarterDay: variant.quarterDay,
      hours: variant.hours,
      workflowRequired: variant.workflowRequired,
      noticePeriodAllowed: variant.noticePeriodAllowed,
      documentsRequired: variant.documentsRequired,
      applicableAfterType:
        (variant as any).applicableAfterType || "date_of_joining",
      applicableAfter: variant.applicableAfter,
      approvalDays: variant.approvalDays,
      minimumHours: variant.minimumHours,
      maxHours: variant.maxHours,
      maxInstances: variant.maxInstances,
      maxInstancesPeriod: variant.maxInstancesPeriod,
      grantingPeriod: variant.grantingPeriod,
    };

    console.log("PTO Variant Edit - Setting form data:", formData);
    form.reset(formData);
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this PTO variant?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setEditingVariant(null);
    form.reset();
    setShowDialog(true);
  };

  const handleEmployeeAssignment = (variantId: number) => {
    setSelectedVariantId(variantId);
    setShowEmployeeAssignment(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVariant(null);
    form.reset();
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              PTO Variants
            </h1>
            <p className="text-sm text-gray-600">
              Manage PTO variant configurations
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create PTO Variant
          </Button>
        </div>

        {/* Variants Grid */}
        {isLoading ? (
          <div className="text-center py-8">Loading PTO variants...</div>
        ) : ptoVariants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No PTO variants configured</p>
            <Button onClick={handleCreateNew} className="mt-4">
              Create your first PTO variant
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ptoVariants.map((variant) => (
              <Card
                key={variant.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{variant.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={variant.enabled ? "default" : "secondary"}
                      >
                        {variant.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {variant.description && (
                    <p className="text-sm text-gray-600">
                      {variant.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Features
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {variant.halfDay && (
                        <Badge variant="outline" className="text-xs">
                          Half Day
                        </Badge>
                      )}
                      {variant.quarterDay && (
                        <Badge variant="outline" className="text-xs">
                          Quarter Day
                        </Badge>
                      )}
                      {variant.hours && (
                        <Badge variant="outline" className="text-xs">
                          Hours
                        </Badge>
                      )}
                      {variant.workflowRequired && (
                        <Badge variant="outline" className="text-xs">
                          Workflow Required
                        </Badge>
                      )}
                      {variant.documentsRequired && (
                        <Badge variant="outline" className="text-xs">
                          Documents Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Configuration Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Configuration
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      {variant.applicableAfter > 0 && (
                        <div>
                          Applicable after: {variant.applicableAfter} days
                        </div>
                      )}
                      {variant.approvalDays > 0 && (
                        <div>Approval days: {variant.approvalDays}</div>
                      )}
                      {variant.maxInstances > 0 && (
                        <div>
                          Max instances: {variant.maxInstances} per{" "}
                          {variant.maxInstancesPeriod}
                        </div>
                      )}
                      {variant.hours && variant.maxHours > 0 && (
                        <div>Max hours: {variant.maxHours}</div>
                      )}
                      <div>Granting period: {variant.grantingPeriod}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmployeeAssignment(variant.id)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Assign
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(variant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(variant.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {editingVariant ? "Edit PTO Variant" : "Create PTO Variant"}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseDialog}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter PTO variant name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter description (optional)"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Enable this PTO variant
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Time Unit Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Time Unit Options</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="halfDay"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Half Day
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quarterDay"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Quarter Day
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Hours
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Hours Configuration (conditional) */}
                {form.watch("hours") && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Hours Configuration</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minimumHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Approval & Workflow Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Approval & Workflow Settings
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workflowRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Workflow Required
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="documentsRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Documents Required
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="noticePeriodAllowed"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Notice Period Allowed
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Applicable After Section */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="applicableAfterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Applicable after</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {/* Option 1: Probation Period Ends */}
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  id="probation_end"
                                  name="applicableAfterType"
                                  value="probation_end"
                                  checked={field.value === "probation_end"}
                                  onChange={() => {
                                    field.onChange("probation_end");
                                    form.setValue("applicableAfter", 0);
                                  }}
                                  className="w-4 h-4"
                                />
                                <label
                                  htmlFor="probation_end"
                                  className="text-sm font-medium"
                                >
                                  Probation period ends
                                </label>
                              </div>

                              {/* Option 2: Date of Joining */}
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  id="date_of_joining"
                                  name="applicableAfterType"
                                  value="date_of_joining"
                                  checked={field.value === "date_of_joining"}
                                  onChange={() => {
                                    field.onChange("date_of_joining");
                                    form.setValue("applicableAfter", 0);
                                  }}
                                  className="w-4 h-4"
                                />
                                <label
                                  htmlFor="date_of_joining"
                                  className="text-sm font-medium"
                                >
                                  On date of joining
                                </label>
                              </div>

                              {/* Option 3: Specified Number of Days */}
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  id="days"
                                  name="applicableAfterType"
                                  value="days"
                                  checked={field.value === "days"}
                                  onChange={() => field.onChange("days")}
                                  className="w-4 h-4"
                                />
                                <label
                                  htmlFor="days"
                                  className="text-sm font-medium"
                                >
                                  Specified number of days:
                                </label>
                                <FormField
                                  control={form.control}
                                  name="applicableAfter"
                                  render={({ field: daysField }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <div className="flex items-center space-x-2">
                                          <Input
                                            type="number"
                                            min="0"
                                            {...daysField}
                                            onChange={(e) => {
                                              const value = Number(
                                                e.target.value,
                                              );
                                              daysField.onChange(
                                                value >= 0 ? value : 0,
                                              );
                                            }}
                                            className="w-24"
                                            disabled={
                                              form.watch(
                                                "applicableAfterType",
                                              ) !== "days"
                                            }
                                            placeholder="0"
                                          />
                                          <span className="text-gray-500 text-sm">
                                            (days) from date of joining{" "}
                                            {form.watch("applicableAfter") === 0
                                              ? "(immediate applicability)"
                                              : ""}
                                          </span>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="approvalDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approval Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Limits & Periods */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Limits & Periods</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="maxInstances"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Instances</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxInstancesPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Instances Period</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Day">Day</SelectItem>
                              <SelectItem value="Week">Week</SelectItem>
                              <SelectItem value="Month">Month</SelectItem>
                              <SelectItem value="Quarter">Quarter</SelectItem>
                              <SelectItem value="Year">Year</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grantingPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Granting Period</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Quarterly">
                                Quarterly
                              </SelectItem>
                              <SelectItem value="Half yearly">
                                Half yearly
                              </SelectItem>
                              <SelectItem value="Yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingVariant
                        ? "Update Variant"
                        : "Create Variant"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Employee Assignment Dialog */}
        {showEmployeeAssignment && selectedVariantId && (
          <PTOEmployeeAssignmentDialog
            open={showEmployeeAssignment}
            onOpenChange={setShowEmployeeAssignment}
            variantId={selectedVariantId}
            onComplete={() => {
              setShowEmployeeAssignment(false);
              // Reload assignments after saving
              if (
                ptoVariants &&
                ptoVariants.length > 0 &&
                allEmployees.length > 0
              ) {
                const loadAssignments = async () => {
                  const assignments: Record<string, any[]> = {};

                  for (const variant of ptoVariants) {
                    try {
                      const response = await fetch(
                        `/api/employee-assignments/pto/${variant.id}`,
                        {
                          credentials: "include",
                          headers: {
                            "X-Org-Id": localStorage.getItem("org_id") || "60",
                          },
                        },
                      );
                      if (response.ok) {
                        const variantAssignments = await response.json();
                        if (
                          Array.isArray(variantAssignments) &&
                          variantAssignments.length > 0
                        ) {
                          const assignedUserIds = variantAssignments.map(
                            (assignment: any) => assignment.userId,
                          );
                          const assignedEmployeeData = allEmployees.filter(
                            (emp) =>
                              assignedUserIds.includes(emp.user_id) ||
                              assignedUserIds.includes(emp.id),
                          );
                          assignments[variant.id] = assignedEmployeeData;
                        } else {
                          assignments[variant.id] = [];
                        }
                      }
                    } catch (error) {
                      assignments[variant.id] = [];
                    }
                  }

                  setVariantAssignments(assignments);
                };
                loadAssignments();
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
}

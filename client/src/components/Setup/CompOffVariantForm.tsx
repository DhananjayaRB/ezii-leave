import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users } from "lucide-react";
import EmployeeAssignment from "./EmployeeAssignment";
import { fetchEmployeeData, transformEmployeeData } from "@/lib/externalApi";

const formSchema = z.object({
  // Basic Information
  leaveVariantName: z.string().min(1, "Comp-off variant name is required"),
  description: z.string().min(1, "Description is required"),
  
  // Comp-off units allowed
  allowFullDay: z.boolean(),
  allowHalfDay: z.boolean(),
  allowQuarterDay: z.boolean(),
  fullDayHours: z.number().min(0).optional(),
  halfDayHours: z.number().min(0).optional(),
  quarterDayHours: z.number().min(0).optional(),
  
  // Eligibility Criteria
  maxApplications: z.number().min(1, "Max applications is required"),
  maxApplicationsPeriod: z.enum(["Month", "Quarter", "Year"]),
  
  // Workflow
  workflowRequired: z.boolean(),
  approvalAdvanceDays: z.number().min(0),
  availWithinDays: z.number().min(0),
  
  // Working days
  allowNonWorkingDays: z.boolean(),
  
  // Withdrawal
  withdrawalBeforeApproval: z.boolean(),
  withdrawalAfterApproval: z.boolean(),
  withdrawalNotAllowed: z.boolean(),
  
  // Notice period
  allowedDuringNotice: z.boolean(),
  
  // Carry Forward and Lapse
  enableCarryForward: z.boolean(),
  carryForwardDays: z.number().min(0).optional(),
  enableLapse: z.boolean(),
  lapsePeriod: z.number().min(0).optional(),
  lapsePeriodUnit: z.enum(["Days", "Month", "Quarter", "Year"]).optional(),
  
  // Compensation
  enableCompensation: z.boolean(),
  maxEncashmentDays: z.number().min(0).optional(),
  maxEncashmentHours: z.number().min(0).optional(),
  encashmentOption: z.boolean(),
  convertToLeavesOption: z.boolean(),
  encashmentBasedOn: z.enum(["basic_pay", "basic_plus_dearness_allowance", "gross_pay"]).optional(),
  convertibleLeaveTypes: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CompOffVariantFormProps {
  variant?: any;
  onClose: () => void;
}

export default function CompOffVariantForm({ variant, onClose }: CompOffVariantFormProps) {
  const { toast } = useToast();
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);

  // Fetch existing employee assignments for this variant
  const { data: existingAssignments = [] } = useQuery({
    queryKey: [`/api/employee-assignments/comp-off-variant/${variant?.id}`],
    enabled: !!variant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Employee data will be fetched from external API (using working LeaveConfigForm pattern)
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const assignedEmployeesRef = useRef<any[]>([]);

  // Load employee data from external API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeeData = await fetchEmployeeData();
        const transformedEmployees = employeeData.map(transformEmployeeData);
        console.log("CompOff: Loaded", transformedEmployees.length, "employees from external API");
        setAllEmployees(transformedEmployees);
      } catch (error) {
        console.error('CompOff: Error loading employees:', error);
        setAllEmployees([]);
      }
    };

    loadEmployees();
  }, []);

  // Query for leave types with variants
  const { data: leaveTypesData } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: leaveVariantsData } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  // Filter leave types that have at least one variant
  const leaveTypesWithVariants = (leaveTypesData as any[] || []).filter((leaveType: any) => 
    (leaveVariantsData as any[] || []).some((variant: any) => variant.leaveTypeId === leaveType.id)
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveVariantName: variant?.name || "",
      description: variant?.description || "",
      allowFullDay: variant?.allowFullDay || false,
      allowHalfDay: variant?.allowHalfDay || false,
      allowQuarterDay: variant?.allowQuarterDay || false,
      fullDayHours: variant?.fullDayHours || 8,
      halfDayHours: variant?.halfDayHours || 4,
      quarterDayHours: variant?.quarterDayHours || 2,
      maxApplications: variant?.maxApplications || 0,
      maxApplicationsPeriod: variant?.maxApplicationsPeriod || "Month",
      workflowRequired: variant?.workflowRequired || false,
      approvalAdvanceDays: variant?.approvalAdvanceDays || 0,
      availWithinDays: variant?.availWithinDays || 0,
      allowNonWorkingDays: variant?.allowNonWorkingDays || false,
      withdrawalBeforeApproval: variant?.withdrawalBeforeApproval || true,
      withdrawalAfterApproval: variant?.withdrawalAfterApproval || false,
      withdrawalNotAllowed: variant?.withdrawalNotAllowed || false,
      allowedDuringNotice: variant?.allowedDuringNotice || false,
      enableCarryForward: variant?.enableCarryForward || false,
      carryForwardDays: variant?.carryForwardDays || 0,
      enableLapse: variant?.enableLapse || false,
      lapsePeriod: variant?.lapsePeriod || 0,
      lapsePeriodUnit: variant?.lapsePeriodUnit || "Month",
      enableCompensation: variant?.enableCompensation || false,
      maxEncashmentDays: variant?.maxEncashmentDays || 0,
      maxEncashmentHours: variant?.maxEncashmentHours || 0,
      encashmentOption: variant?.encashmentOption || true,
      convertToLeavesOption: variant?.convertToLeavesOption || false,
      encashmentBasedOn: variant?.encashmentBasedOn || "basic_pay",
      convertibleLeaveTypes: variant?.convertibleLeaveTypes || [],
    },
  });

  // Reset form values when variant changes
  useEffect(() => {
    if (variant) {
      console.log("=== FORM POPULATION DEBUG ===");
      console.log("Variant data:", variant);
      
      const formValues = {
        // Basic fields
        leaveVariantName: variant.name || "",
        description: variant.description || "",
        workflowRequired: variant.workflowRequired || false,
        approvalAdvanceDays: variant.approvalDays || 0,
        availWithinDays: variant.expiryDays === 365 ? 0 : variant.expiryDays || 0,
        
        // Comp-off units configuration - use database values or defaults
        allowFullDay: variant.allowFullDay !== undefined ? variant.allowFullDay : true,
        allowHalfDay: variant.allowHalfDay !== undefined ? variant.allowHalfDay : true,
        allowQuarterDay: variant.allowQuarterDay !== undefined ? variant.allowQuarterDay : false,
        fullDayHours: variant.fullDayHours || 8,
        halfDayHours: variant.halfDayHours || 4,
        quarterDayHours: variant.quarterDayHours || 2,
        
        // Eligibility criteria
        maxApplications: variant.maxApplications || variant.maxBalance || 1,
        maxApplicationsPeriod: variant.maxApplicationsPeriod || "Month",
        
        // Working days
        allowNonWorkingDays: variant.allowNonWorkingDays || false,
        
        // Withdrawal settings - fix logic for editing
        withdrawalBeforeApproval: variant.withdrawalBeforeApproval || false,
        withdrawalAfterApproval: variant.withdrawalAfterApproval || false,
        withdrawalNotAllowed: variant.withdrawalNotAllowed === true && !variant.withdrawalBeforeApproval && !variant.withdrawalAfterApproval,
        
        // Notice period
        allowedDuringNotice: variant.allowedDuringNotice !== undefined ? variant.allowedDuringNotice : false,
        
        // Carry Forward and Lapse
        enableCarryForward: variant.enableCarryForward || false,
        carryForwardDays: variant.carryForwardDays || 0,
        enableLapse: variant.enableLapse || false,
        lapsePeriod: variant.lapsePeriod || 0,
        lapsePeriodUnit: variant.lapsePeriodUnit || "Month",
        
        // Compensation settings
        enableCompensation: variant.enableCompensation || false,
        maxEncashmentDays: variant.maxEncashmentDays || 0,
        maxEncashmentHours: variant.maxEncashmentHours || 0,
        encashmentOption: variant.encashmentOption !== undefined ? variant.encashmentOption : true,
        convertToLeavesOption: variant.convertToLeavesOption || false,
        encashmentBasedOn: variant.encashmentBasedOn || "basic_pay",
        convertibleLeaveTypes: variant.convertibleLeaveTypes || [],
      };
      
      console.log("Form values being set:", formValues);
      form.reset(formValues);
      
      // Check what actually got set
      setTimeout(() => {
        console.log("Actual form values after reset:", form.getValues());
      }, 100);
    }
  }, [variant, form]);

  // Load assigned employees when variant changes or assignments are fetched (using working LeaveConfigForm pattern)
  useEffect(() => {
    console.log("=== COMP-OFF EMPLOYEE MATCHING DEBUG ===");
    console.log("CompOff: Loading assigned employees - variant ID:", variant?.id);
    console.log("CompOff: Existing assignments:", existingAssignments);
    console.log("CompOff: All employees from external API:", allEmployees.length, "employees");
    
    if (variant?.id && Array.isArray(existingAssignments) && existingAssignments.length > 0) {
      const assignedUserIds = existingAssignments.map((assignment: any) => assignment.userId);
      console.log("CompOff: Assigned user IDs from database:", assignedUserIds);
      
      // If external API failed, create fallback employee objects from assignments
      if (allEmployees.length === 0) {
        console.log("CompOff: External API failed, creating fallback employee objects");
        const fallbackEmployees = assignedUserIds.map((userId: string) => ({
          user_id: userId,
          user_name: `Employee ${userId}`,
          employee_number: `E${userId}`
        }));
        console.log("CompOff: Created fallback employees:", fallbackEmployees);
        setAssignedEmployees(fallbackEmployees);
        assignedEmployeesRef.current = fallbackEmployees;
      } else {
        // Try to match with external API data
        const assignedEmployeeData = allEmployees.filter(emp => {
          const empId = emp.user_id || emp.id;
          const isAssigned = assignedUserIds.includes(empId);
          if (isAssigned) {
            console.log("CompOff: Found assigned employee:", emp.user_name, "with ID:", empId);
          }
          return isAssigned;
        });
        
        console.log("CompOff: Matched assigned employees from external API:", assignedEmployeeData.length);
        setAssignedEmployees(assignedEmployeeData);
        assignedEmployeesRef.current = assignedEmployeeData;
      }
    } else if (!variant?.id) {
      console.log("CompOff: New variant - clearing assignments");
      setAssignedEmployees([]);
      assignedEmployeesRef.current = [];
    } else {
      console.log("CompOff: No assignments found - clearing assigned employees");
      setAssignedEmployees([]);
      assignedEmployeesRef.current = [];
    }
    console.log("=== END COMP-OFF EMPLOYEE MATCHING DEBUG ===");
  }, [existingAssignments, variant?.id, allEmployees]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("=== FORM SUBMISSION DEBUG ===");
      console.log("Raw form data:", data);
      
      // Map form fields to comprehensive database schema
      const payload = {
        name: data.leaveVariantName,
        description: data.description,
        enabled: true,
        
        // Comp-off units configuration
        allowFullDay: data.allowFullDay || false,
        fullDayHours: data.fullDayHours || 0,
        allowHalfDay: data.allowHalfDay || false,
        halfDayHours: data.halfDayHours || 0,
        allowQuarterDay: data.allowQuarterDay || false,
        quarterDayHours: data.quarterDayHours || 0,
        
        // Eligibility criteria
        maxApplications: data.maxApplications || 1,
        maxApplicationsPeriod: data.maxApplicationsPeriod || "Month",
        
        // Workflow settings
        workflowRequired: data.workflowRequired || false,
        documentsRequired: false,
        applicableAfter: 0,
        approvalDays: data.approvalAdvanceDays || 0,
        expiryDays: data.availWithinDays || 365,
        
        // Working days
        allowNonWorkingDays: data.allowNonWorkingDays || false,
        
        // Withdrawal settings
        withdrawalBeforeApproval: data.withdrawalBeforeApproval || false,
        withdrawalAfterApproval: data.withdrawalAfterApproval || false,
        withdrawalNotAllowed: data.withdrawalNotAllowed || true,
        
        // Notice period
        allowedDuringNotice: data.allowedDuringNotice || true,
        
        // Carry Forward and Lapse
        enableCarryForward: data.enableCarryForward || false,
        carryForwardDays: data.carryForwardDays || 0,
        enableLapse: data.enableLapse || false,
        lapsePeriod: data.lapsePeriod || 0,
        lapsePeriodUnit: data.lapsePeriodUnit || "Month",
        
        // Compensation settings
        enableCompensation: data.enableCompensation || false,
        encashmentOption: data.encashmentOption || false,
        convertToLeavesOption: data.convertToLeavesOption || false,
        encashmentBasedOn: data.encashmentBasedOn || null,
        maxEncashmentDays: data.maxEncashmentDays || 0,
        maxEncashmentHours: data.maxEncashmentHours || 0,
        convertibleLeaveTypes: data.convertibleLeaveTypes || [],
        
        // Legacy field for backward compatibility
        maxBalance: data.maxApplications || 1,
      };
      
      console.log("Payload being sent to API:", payload);

      if (variant?.id) {
        return await apiRequest("PATCH", `/api/comp-off-variants/${variant.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/comp-off-variants", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: variant?.id ? "Comp-off variant updated successfully" : "Comp-off variant created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-variants"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save comp-off variant",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("=== FORM SUBMISSION TRIGGERED ===");
    console.log("Form submission triggered with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    
    // Required field validation - name and description
    if (!data.leaveVariantName || data.leaveVariantName.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Comp-off variant name is required and cannot be left blank.",
        variant: "destructive",
      });
      return;
    }

    if (!data.description || data.description.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Description is required and cannot be left blank.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation - at least one unit must be selected
    if (!data.allowFullDay && !data.allowHalfDay && !data.allowQuarterDay) {
      toast({
        title: "Validation Error",
        description: "Please select at least one comp-off unit (Full Day, Half Day, or Quarter Day).",
        variant: "destructive",
      });
      return;
    }

    // Comp-off units validation
    const fullDay = data.fullDayHours || 0;
    const halfDay = data.halfDayHours || 0;
    const quarterDay = data.quarterDayHours || 0;

    // Required field validation - if checkbox is selected, input must be > 0
    if (data.allowFullDay && (!data.fullDayHours || data.fullDayHours <= 0)) {
      toast({
        title: "Validation Error",
        description: "Full Day hours is required and must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowHalfDay && (!data.halfDayHours || data.halfDayHours <= 0)) {
      toast({
        title: "Validation Error", 
        description: "Half Day hours is required and must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowQuarterDay && (!data.quarterDayHours || data.quarterDayHours <= 0)) {
      toast({
        title: "Validation Error",
        description: "Quarter Day hours is required and must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Duplicate values validation
    if (data.allowFullDay && data.allowHalfDay && fullDay > 0 && halfDay > 0 && fullDay === halfDay) {
      toast({
        title: "Validation Error",
        description: "Full Day and Half Day hours cannot be the same.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowFullDay && data.allowQuarterDay && fullDay > 0 && quarterDay > 0 && fullDay === quarterDay) {
      toast({
        title: "Validation Error",
        description: "Full Day and Quarter Day hours cannot be the same.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowHalfDay && data.allowQuarterDay && halfDay > 0 && quarterDay > 0 && halfDay === quarterDay) {
      toast({
        title: "Validation Error",
        description: "Half Day and Quarter Day hours cannot be the same.",
        variant: "destructive",
      });
      return;
    }

    // Hierarchical validation - Full Day > Half Day > Quarter Day
    if (data.allowFullDay && data.allowHalfDay && fullDay > 0 && halfDay > 0 && fullDay <= halfDay) {
      toast({
        title: "Validation Error",
        description: "Full Day hours must be greater than Half Day hours.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowHalfDay && data.allowQuarterDay && halfDay > 0 && quarterDay > 0 && halfDay <= quarterDay) {
      toast({
        title: "Validation Error",
        description: "Half Day hours must be greater than Quarter Day hours.",
        variant: "destructive",
      });
      return;
    }

    if (data.allowFullDay && data.allowQuarterDay && fullDay > 0 && quarterDay > 0 && fullDay <= quarterDay) {
      toast({
        title: "Validation Error",
        description: "Full Day hours must be greater than Quarter Day hours.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(data);
  };

  const handleEmployeeAssignmentSave = async (selectedEmployees: any[]) => {
    setAssignedEmployees(selectedEmployees);
    setShowEmployeeAssignment(false);

    if (!variant?.id) {
      toast({
        title: "Info",
        description: "Employee assignments will be saved after creating the comp-off variant.",
      });
      return;
    }

    try {
      // Use bulk endpoint with proper variant ID and type information
      const response = await fetch('/api/employee-assignments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': localStorage.getItem('org_id') || '',
        },
        body: JSON.stringify({
          leaveVariantId: variant.id,
          assignmentType: 'comp_off_variant',
          userIds: selectedEmployees.map(emp => emp.user_id || emp.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save employee assignments');
      }

      // Update assigned employees ref
      assignedEmployeesRef.current = selectedEmployees;

      toast({
        title: "Success",
        description: "Employee assignments updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save employee assignments",
        variant: "destructive",
      });
    }
  };

  if (showEmployeeAssignment) {
    return (
      <EmployeeAssignment
        onClose={() => setShowEmployeeAssignment(false)}
        onAssign={handleEmployeeAssignmentSave}
        preSelectedEmployees={assignedEmployees}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center p-6 border-b">
          <Button variant="ghost" size="sm" onClick={onClose} className="mr-4">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">
              {variant ? "Edit Comp-off Variant" : "Create Comp-off Variant"}
            </h2>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-180px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8 pb-12">
              
              {/* Comp-off units allowed */}
              <Card>
                <CardHeader>
                  <CardTitle>Comp-off units allowed</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure the time units and their corresponding hours for comp-off applications
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <FormField
                        control={form.control}
                        name="allowFullDay"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Full Day (hours)</FormLabel>
                          </FormItem>
                        )}
                      />
                      {form.watch("allowFullDay") && (
                        <FormField
                          control={form.control}
                          name="fullDayHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="8"
                                  className={`w-24 ${
                                    form.watch("allowFullDay") && (!field.value || field.value <= 0) 
                                      ? 'border-red-300' 
                                      : ''
                                  }`}
                                  min="1"
                                  step="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              {form.watch("allowFullDay") && (!field.value || field.value <= 0) && (
                                <span className="text-xs text-red-500">Required and must be {`>`} 0</span>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <FormField
                        control={form.control}
                        name="allowHalfDay"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Half Day (hours)</FormLabel>
                          </FormItem>
                        )}
                      />
                      {form.watch("allowHalfDay") && (
                        <FormField
                          control={form.control}
                          name="halfDayHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="4"
                                  className={`w-24 ${
                                    form.watch("allowHalfDay") && (!field.value || field.value <= 0) 
                                      ? 'border-red-300' 
                                      : ''
                                  }`}
                                  min="1"
                                  step="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              {form.watch("allowHalfDay") && (!field.value || field.value <= 0) && (
                                <span className="text-xs text-red-500">Required and must be {`>`} 0</span>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <FormField
                        control={form.control}
                        name="allowQuarterDay"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Quarter Day (hours)</FormLabel>
                          </FormItem>
                        )}
                      />
                      {form.watch("allowQuarterDay") && (
                        <FormField
                          control={form.control}
                          name="quarterDayHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="2"
                                  className={`w-24 ${
                                    form.watch("allowQuarterDay") && (!field.value || field.value <= 0) 
                                      ? 'border-red-300' 
                                      : ''
                                  }`}
                                  min="1"
                                  step="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              {form.watch("allowQuarterDay") && (!field.value || field.value <= 0) && (
                                <span className="text-xs text-red-500">Required and must be {`>`} 0</span>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Validation Messages */}
                    {(() => {
                      const fullDay = form.watch("fullDayHours") || 0;
                      const halfDay = form.watch("halfDayHours") || 0;
                      const quarterDay = form.watch("quarterDayHours") || 0;
                      
                      const allowFullDay = form.watch("allowFullDay");
                      const allowHalfDay = form.watch("allowHalfDay");
                      const allowQuarterDay = form.watch("allowQuarterDay");
                      
                      const validationErrors = [];
                      
                      // Check for duplicate values
                      if (allowFullDay && allowHalfDay && fullDay > 0 && halfDay > 0 && fullDay === halfDay) {
                        validationErrors.push("Full Day and Half Day hours cannot be the same");
                      }
                      if (allowFullDay && allowQuarterDay && fullDay > 0 && quarterDay > 0 && fullDay === quarterDay) {
                        validationErrors.push("Full Day and Quarter Day hours cannot be the same");
                      }
                      if (allowHalfDay && allowQuarterDay && halfDay > 0 && quarterDay > 0 && halfDay === quarterDay) {
                        validationErrors.push("Half Day and Quarter Day hours cannot be the same");
                      }
                      
                      // Check hierarchical validation
                      if (allowFullDay && allowHalfDay && fullDay > 0 && halfDay > 0 && fullDay <= halfDay) {
                        validationErrors.push("Full Day hours must be greater than Half Day hours");
                      }
                      if (allowHalfDay && allowQuarterDay && halfDay > 0 && quarterDay > 0 && halfDay <= quarterDay) {
                        validationErrors.push("Half Day hours must be greater than Quarter Day hours");
                      }
                      if (allowFullDay && allowQuarterDay && fullDay > 0 && quarterDay > 0 && fullDay <= quarterDay) {
                        validationErrors.push("Full Day hours must be greater than Quarter Day hours");
                      }
                      
                      if (validationErrors.length > 0) {
                        return (
                          <div className="space-y-1">
                            {validationErrors.map((error, index) => (
                              <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                {error}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Comp-off Variant Name and Description */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="leaveVariantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comp-off Variant Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="eg. For Factory Employees in Karnataka" 
                          className={(!field.value || field.value.trim() === '') ? 'border-red-300' : ''}
                          {...field} 
                        />
                      </FormControl>
                      {(!field.value || field.value.trim() === '') && (
                        <span className="text-xs text-red-500">Comp-off variant name is required and cannot be left blank</span>
                      )}
                      <p className="text-sm text-gray-500">Create tailored comp-off policies for specific groups of employees using variants</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="eg. Earn comp-offs for working extra hours and use them for time off"
                          rows={3}
                          className={(!field.value || field.value.trim() === '') ? 'border-red-300' : ''}
                          {...field}
                        />
                      </FormControl>
                      {(!field.value || field.value.trim() === '') && (
                        <span className="text-xs text-red-500">Description is required and cannot be left blank</span>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Eligibility Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Criteria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm">Maximum Comp-Off applications</span>
                    <FormField
                      control={form.control}
                      name="maxApplications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-20"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-gray-500">(applications)</span>
                    <span className="text-sm">in a</span>
                    <FormField
                      control={form.control}
                      name="maxApplicationsPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Month">Month</SelectItem>
                              <SelectItem value="Quarter">Quarter</SelectItem>
                              <SelectItem value="Year">Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm">Does this require a review workflow for approval?</span>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={form.watch("workflowRequired") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${form.watch("workflowRequired") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("workflowRequired", true)}
                        >
                          Workflow
                        </Button>
                        <Button
                          type="button"
                          variant={!form.watch("workflowRequired") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${!form.watch("workflowRequired") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("workflowRequired", false)}
                        >
                          No Workflow
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-sm">Approval request should be made</span>
                      <FormField
                        control={form.control}
                        name="approvalAdvanceDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                className="w-20"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <span className="text-sm text-gray-500">(days)</span>
                      <span className="text-sm">in advance</span>
                    </div>



                    <div className="flex items-center space-x-4">
                      <span className="text-sm">Allow on non-working days?</span>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={form.watch("allowNonWorkingDays") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${form.watch("allowNonWorkingDays") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("allowNonWorkingDays", true)}
                        >
                          Allowed
                        </Button>
                        <Button
                          type="button"
                          variant={!form.watch("allowNonWorkingDays") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${!form.watch("allowNonWorkingDays") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("allowNonWorkingDays", false)}
                        >
                          Not Allowed
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-sm">Withdrawal of application allowed</span>
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={form.watch("withdrawalBeforeApproval")}
                            onCheckedChange={(checked) => {
                              form.setValue("withdrawalBeforeApproval", !!checked);
                              if (checked) {
                                // Uncheck "Not allowed" when Before approval is selected
                                form.setValue("withdrawalNotAllowed", false);
                              }
                            }}
                          />
                          <span className="text-sm">Before approval</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={form.watch("withdrawalAfterApproval")}
                            onCheckedChange={(checked) => {
                              form.setValue("withdrawalAfterApproval", !!checked);
                              if (checked) {
                                // Uncheck "Not allowed" when After approval is selected
                                form.setValue("withdrawalNotAllowed", false);
                              }
                            }}
                          />
                          <span className="text-sm">After approval</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={form.watch("withdrawalNotAllowed")}
                            onCheckedChange={(checked) => {
                              form.setValue("withdrawalNotAllowed", !!checked);
                              if (checked) {
                                // Uncheck both approval options when Not allowed is selected
                                form.setValue("withdrawalBeforeApproval", false);
                                form.setValue("withdrawalAfterApproval", false);
                              }
                            }}
                          />
                          <span className="text-sm">Not allowed</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-sm">During notice period, Comp-offs are</span>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={form.watch("allowedDuringNotice") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${form.watch("allowedDuringNotice") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("allowedDuringNotice", true)}
                        >
                          Allowed
                        </Button>
                        <Button
                          type="button"
                          variant={!form.watch("allowedDuringNotice") ? "default" : "outline"}
                          className={`px-4 py-1 text-sm ${!form.watch("allowedDuringNotice") ? "bg-green-600 text-white" : ""}`}
                          onClick={() => form.setValue("allowedDuringNotice", false)}
                        >
                          Not Allowed
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Carry Forward and Lapse */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Carry Forward and lapse</span>
                    <Switch
                      checked={form.watch("enableCarryForward") || form.watch("enableLapse")}
                      onCheckedChange={(checked) => {
                        form.setValue("enableCarryForward", checked);
                        form.setValue("enableLapse", checked);
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(form.watch("enableCarryForward") || form.watch("enableLapse")) && (
                    <>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">Earned Comp-Off days will lapse in</span>
                        <FormField
                          control={form.control}
                          name="lapsePeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lapsePeriodUnit"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Days">Days</SelectItem>
                                  <SelectItem value="Month">Month</SelectItem>
                                  <SelectItem value="Quarter">Quarter</SelectItem>
                                  <SelectItem value="Year">Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="text-sm">Carry forward to next cycle</span>
                        <FormField
                          control={form.control}
                          name="carryForwardDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-sm text-gray-500">(days)</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Compensation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Compensation</span>
                    <Switch
                      checked={form.watch("enableCompensation")}
                      onCheckedChange={(checked) => form.setValue("enableCompensation", checked)}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.watch("enableCompensation") && (
                    <>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">Maximum days that can be encashed</span>
                        <FormField
                          control={form.control}
                          name="maxEncashmentDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-sm text-gray-500">(days)</span>
                        <FormField
                          control={form.control}
                          name="maxEncashmentHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-sm text-gray-500">(hours)</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-sm">Compensation options</span>
                          <div className="flex space-x-4">
                            <FormField
                              control={form.control}
                              name="encashmentOption"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm">En-cashment</FormLabel>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="convertToLeavesOption"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm">Convert to leaves</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Encashment Configuration */}
                        {form.watch("encashmentOption") && (
                          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                            <div className="space-y-2">
                              <span className="text-sm font-medium">Encashment based on</span>
                              <div className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name="encashmentBasedOn"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <input
                                          type="radio"
                                          value="basic_pay"
                                          checked={field.value === "basic_pay"}
                                          onChange={() => field.onChange("basic_pay")}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Basic Pay</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="encashmentBasedOn"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <input
                                          type="radio"
                                          value="basic_plus_dearness_allowance"
                                          checked={field.value === "basic_plus_dearness_allowance"}
                                          onChange={() => field.onChange("basic_plus_dearness_allowance")}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Basic + Dearness Allowance</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="encashmentBasedOn"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <input
                                          type="radio"
                                          value="gross_pay"
                                          checked={field.value === "gross_pay"}
                                          onChange={() => field.onChange("gross_pay")}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm">Gross Pay</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <span className="text-sm">Max encashment</span>
                              <FormField
                                control={form.control}
                                name="maxEncashmentDays"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        className="w-20"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <span className="text-sm text-gray-500">(days)</span>
                            </div>
                          </div>
                        )}

                        {/* Convert to Leaves Configuration */}
                        {form.watch("convertToLeavesOption") && (
                          <div className="space-y-4 pl-4 border-l-2 border-green-200">
                            <div className="space-y-2">
                              <span className="text-sm font-medium">Convert to which leave types</span>
                              <div className="space-y-2">
                                {leaveTypesWithVariants.map((leaveType: any) => (
                                  <FormField
                                    key={leaveType.id}
                                    control={form.control}
                                    name="convertibleLeaveTypes"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(leaveType.id) || false}
                                            onCheckedChange={(checked) => {
                                              const currentValues = field.value || [];
                                              if (checked) {
                                                field.onChange([...currentValues, leaveType.id]);
                                              } else {
                                                field.onChange(currentValues.filter((id: number) => id !== leaveType.id));
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm">{leaveType.name}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                                {leaveTypesWithVariants.length === 0 && (
                                  <div className="text-sm text-gray-500 italic">
                                    No leave types with variants available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Assign to Employees */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Assign to Employees</CardTitle>
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => setShowEmployeeAssignment(true)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Assign Employees
                    </Button>
                  </div>
                </CardHeader>
                {assignedEmployees.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {assignedEmployees.length} employee{assignedEmployees.length > 1 ? 's' : ''} assigned
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {assignedEmployees.slice(0, 3).map((employee, index) => (
                          <div key={employee.user_id} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {(employee.name || employee.user_name || `Employee ${employee.user_id}`).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-700">
                              {employee.name || employee.user_name || `Employee ${employee.user_id}`}
                            </span>
                          </div>
                        ))}
                        {assignedEmployees.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{assignedEmployees.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Submit buttons - moved inside form */}
              <div className="flex justify-between p-8 mt-4 border-t bg-gray-50 sticky bottom-0">
                <div className="flex space-x-4">
                  <Button variant="outline" onClick={onClose} type="button" className="px-6 py-3 min-h-[44px]">
                    Discard
                  </Button>
                  {variant?.id && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Add delete functionality if needed
                        console.log("Delete variant:", variant.id);
                      }}
                      type="button"
                      className="px-6 py-3 min-h-[44px]"
                    >
                      Delete Variant
                    </Button>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    onClick={() => {
                      console.log("Update button clicked - triggering manual form submission");
                      const formData = form.getValues();
                      console.log("Current form values:", formData);
                      onSubmit(formData);
                    }}
                    disabled={mutation.isPending} 
                    className="px-6 py-3 min-h-[44px]"
                  >
                    {mutation.isPending ? "Saving..." : (variant ? "Update Comp-off Variant" : "Create Comp-off Variant")}
                  </Button>
                </div>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
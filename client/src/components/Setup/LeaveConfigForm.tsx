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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Smile, Users } from "lucide-react";
import EmployeeAssignment from "./EmployeeAssignment";
import { fetchEmployeeData, transformEmployeeData } from "@/lib/externalApi";

// Global variable to store assigned employees during form creation
let pendingEmployeeAssignments: any[] = [];

const slabSchema = z.object({
  earnDays: z.number().min(0, "Earn days must be at least 0"),
  daysWorked: z.number().min(0, "Days worked must be at least 0"),
});

const daySlabSchema = z.object({
  fromDay: z.number().min(1).max(31),
  toDay: z.number().min(1).max(31),
  earnDays: z.number().min(0),
});

const formSchema = z.object({
  // Required fields marked with * in screenshots
  leaveVariantName: z.string().min(1, "Leave variant name is required"),
  description: z.string().min(1, "Description is required"),
  minimumLeaveUnit: z.array(z.enum(["full_day", "half_day"])).min(1, "At least one leave unit must be selected"),
  leavesGrantedOn: z.enum(["calendar_days", "compliance"]),
  paidDaysInYear: z.number().min(1, "Paid days in a year is required"),
  complianceGrantDays: z.number().optional(),
  complianceForEveryDays: z.number().optional(),
  grantLeaves: z.enum(["in_advance", "after_earning"]),
  grantFrequency: z.enum(["per_month", "per_quarter", "per_year"]),
  proRataCalculation: z.enum(["full_month", "slab_system", "rounding_off"]),
  slabs: z.array(slabSchema).optional(),
  onboardingSlabs: z.array(daySlabSchema).optional(),
  exitSlabs: z.array(daySlabSchema).optional(),
  fractionalLeaves: z.enum(["rounded_up", "rounded_down", "normal_rounding"]).default("normal_rounding"),
  
  // Required field - Applicable for the genders *
  applicableGenders: z.array(z.enum(["male", "female"])).min(1, "At least one gender must be selected"),
  
  applicableAfter: z.number().min(0),
  applicableAfterType: z.enum(["days", "probation_end", "date_of_joining"]).default("days"),
  mustBePlannedInAdvance: z.number().min(0),
  maxDaysInStretch: z.number().min(0),
  minDaysRequired: z.number().min(0),
  maxInstances: z.number().min(0),
  maxInstancesPeriod: z.enum(["month", "quarter", "year"]),
  allowLeavesBeforeWeekend: z.boolean(),
  allowLeavesAfterWeekend: z.boolean(),
  allowLeavesBeforeHoliday: z.boolean(),
  allowLeavesAfterHoliday: z.boolean(),
  allowClubbing: z.boolean(),
  supportingDocuments: z.boolean(),
  supportingDocumentsText: z.string().optional(),
  allowDuringNotice: z.boolean(),
  requiresWorkflow: z.boolean(),
  leaveBalanceDeduction: z.enum(["before_workflow", "after_workflow"]),
  
  // Required field - Grace period for applying *
  gracePeriod: z.number().min(0),
  
  // Required field - Withdrawal of application is allowed *
  allowWithdrawalBeforeApproval: z.boolean(),
  allowWithdrawalAfterApproval: z.boolean(),
  allowWithdrawalNotAllowed: z.boolean(),
  
  negativeLeaveBalance: z.number().min(0),
  carryForwardLimit: z.number().min(0),
  carryForwardPeriod: z.enum(["month", "quarter", "year"]),
  encashment: z.boolean(),
  encashmentCalculation: z.enum(["basic_da", "ctc", "gross_salary"]).optional(),
  maxEncashmentDays: z.number().min(-1).optional(), // Allow -1 for "No Limit"
  encashmentTiming: z.enum(["exit_retirement", "annually"]).optional(),
  allowApplicationsOnBehalf: z.boolean(),
  showAvailedLeaves: z.boolean(),
  showBalanceLeaves: z.boolean(),
  maximumBalance: z.number().min(0),
}).refine((data) => {
  // When encashment is enabled, certain fields become required
  if (data.encashment) {
    // maxEncashmentDays must be defined (either a positive number or -1 for "No Limit")
    // encashmentCalculation must be selected
    return data.encashmentCalculation && data.maxEncashmentDays !== undefined && data.maxEncashmentDays !== null;
  }
  return true;
}, {
  message: "Calculate encashment using and Max days are required when encashment is enabled",
  path: ["encashmentCalculation"]
}).refine((data) => {
  // Validate slab system doesn't exceed allocation based on grant frequency
  if (data.proRataCalculation === "slab_system" && data.slabs && data.grantFrequency) {
    let periodAllocation;
    
    switch (data.grantFrequency) {
      case "per_month":
        periodAllocation = data.paidDaysInYear / 12;
        break;
      case "per_quarter":
        periodAllocation = data.paidDaysInYear / 4;
        break;
      case "per_year":
        periodAllocation = data.paidDaysInYear;
        break;
      default:
        periodAllocation = data.paidDaysInYear / 12; // default to monthly
    }
    
    const totalEarnedDays = data.slabs.reduce((sum, slab) => sum + slab.earnDays, 0);
    if (totalEarnedDays > periodAllocation) {
      return false;
    }
  }
  return true;
}, {
  message: "Total earned days in slabs cannot exceed allocation based on selected grant frequency",
  path: ["slabs"]
}).refine((data) => {
  // Mutual exclusivity: advance planning and grace period cannot both be enabled
  const hasAdvancePlanning = data.mustBePlannedInAdvance > 0;
  const hasGracePeriod = data.gracePeriod > 0;
  
  if (hasAdvancePlanning && hasGracePeriod) {
    return false;
  }
  return true;
}, {
  message: "Leave application advance planning and grace period are mutually exclusive - only one can be enabled",
  path: ["mustBePlannedInAdvance"]
});

interface LeaveConfigFormProps {
  variant?: any;
  leaveType: {
    id?: number;
    name: string;
    icon: string;
    color: string;
  };
  onClose: () => void;
}

export default function LeaveConfigForm({ variant, leaveType, onClose }: LeaveConfigFormProps) {
  const { toast } = useToast();
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);
  const assignedEmployeesRef = useRef<any[]>([]);

  // Fetch existing employee assignments for this variant
  const { data: existingAssignments = [] } = useQuery({
    queryKey: [`/api/employee-assignments/${variant?.id}`],
    enabled: !!variant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Employee data will be fetched from external API
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Load employee data from external API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeeData = await fetchEmployeeData();
        const transformedEmployees = employeeData.map(transformEmployeeData);
        setAllEmployees(transformedEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
      }
    };

    loadEmployees();
  }, []);

  // Load assigned employees when variant changes or assignments are fetched
  useEffect(() => {
    console.log("Loading assigned employees - variant ID:", variant?.id);
    console.log("Existing assignments:", existingAssignments);
    console.log("All employees from external API:", allEmployees.length, "employees");
    
    if (variant?.id && Array.isArray(existingAssignments) && existingAssignments.length > 0) {
      const assignedUserIds = existingAssignments.map((assignment: any) => assignment.userId);
      console.log("Assigned user IDs from database:", assignedUserIds);
      
      // Try to match with both user_id and id fields from external API
      const assignedEmployeeData = allEmployees.filter(emp => {
        const empId = emp.user_id || emp.id;
        const isAssigned = assignedUserIds.includes(empId);
        if (isAssigned) {
          console.log("Found assigned employee:", emp.user_name, "with ID:", empId);
        }
        return isAssigned;
      });
      
      console.log("Matched assigned employees:", assignedEmployeeData.length);
      setAssignedEmployees(assignedEmployeeData);
      assignedEmployeesRef.current = assignedEmployeeData;
    } else if (!variant?.id) {
      // For new variants, use the global pending assignments
      console.log("New variant - using pending assignments:", pendingEmployeeAssignments.length);
      setAssignedEmployees(pendingEmployeeAssignments);
      assignedEmployeesRef.current = pendingEmployeeAssignments;
    } else {
      console.log("No assignments found - clearing assigned employees");
      setAssignedEmployees([]);
      assignedEmployeesRef.current = [];
    }
  }, [existingAssignments, variant?.id, allEmployees]);

  // Watch for pro-rata calculation changes to initialize slabs and reset fractional leaves
  const watchProRataCalculation = (value: string) => {
    if (value === "slab_system") {
      if (!form.getValues("slabs") || form.getValues("slabs")?.length === 0) {
        form.setValue("slabs", [{ earnDays: 0, daysWorked: 0 }]);
      }
      // Clear fractional leaves when not using rounding off
      form.setValue("fractionalLeaves", "normal_rounding");
    } else if (value === "rounding_off") {
      // Clear slabs when not using slab system
      form.setValue("slabs", []);
      // Set default fractional leaves if not set
      if (!form.getValues("fractionalLeaves")) {
        form.setValue("fractionalLeaves", "normal_rounding");
      }
    } else {
      // Clear both slabs and reset fractional leaves for full month
      form.setValue("slabs", []);
      form.setValue("fractionalLeaves", "normal_rounding");
    }
  };

  type FormData = z.infer<typeof formSchema>;
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveVariantName: variant?.leaveVariantName || "",
      description: variant?.description || "",
      minimumLeaveUnit: variant?.minimumLeaveUnit 
        ? (Array.isArray(variant.minimumLeaveUnit) 
          ? variant.minimumLeaveUnit 
          : typeof variant.minimumLeaveUnit === 'string'
            ? variant.minimumLeaveUnit.replace(/^\{/, '').replace(/\}$/, '').replace(/"/g, '').split(',').map((unit: any) => unit.trim()).filter((unit: any) => unit)
            : ["full_day"])
        : ["full_day"],
      leavesGrantedOn: variant?.leavesGrantedOn || "calendar_days",
      paidDaysInYear: variant?.paidDaysInYear || 12,
      complianceGrantDays: variant?.complianceGrantDays || 1,
      complianceForEveryDays: variant?.complianceForEveryDays || 20,
      grantLeaves: variant?.grantLeaves || "in_advance",
      grantFrequency: variant?.grantFrequency || "per_month",
      proRataCalculation: variant?.proRataCalculation || "full_month",
      slabs: variant?.slabs || [],
      onboardingSlabs: (() => {
        const slabs = variant?.onboardingSlabs || [{ fromDay: 1, toDay: 31, earnDays: 0 }];
        // Remove duplicate slabs with exact same fromDay and toDay
        const uniqueSlabs = slabs.filter((slab, index, arr) => 
          arr.findIndex(s => s.fromDay === slab.fromDay && s.toDay === slab.toDay) === index
        );
        return uniqueSlabs.length > 0 ? uniqueSlabs : [{ fromDay: 1, toDay: 31, earnDays: 0 }];
      })(),
      exitSlabs: (() => {
        const slabs = variant?.exitSlabs || [{ fromDay: 1, toDay: 31, earnDays: 0 }];
        // Remove duplicate slabs with exact same fromDay and toDay
        const uniqueSlabs = slabs.filter((slab, index, arr) => 
          arr.findIndex(s => s.fromDay === slab.fromDay && s.toDay === slab.toDay) === index
        );
        return uniqueSlabs.length > 0 ? uniqueSlabs : [{ fromDay: 1, toDay: 31, earnDays: 0 }];
      })(),
      fractionalLeaves: variant?.fractionalLeaves || "normal_rounding",
      applicableGenders: variant?.applicableGenders || ["male", "female"],
      applicableAfter: variant?.applicableAfter || 0,
      applicableAfterType: variant?.applicableAfterType || "days",
      mustBePlannedInAdvance: variant?.mustBePlannedInAdvance || 0,
      maxDaysInStretch: variant?.maxDaysInStretch || 0,
      minDaysRequired: variant?.minDaysRequired || 0,
      maxInstances: variant?.maxInstances || 0,
      maxInstancesPeriod: variant?.maxInstancesPeriod || "month",
      allowLeavesBeforeWeekend: variant?.allowLeavesBeforeWeekend ?? true,
      allowLeavesAfterWeekend: variant?.allowLeavesAfterWeekend ?? true,
      allowLeavesBeforeHoliday: variant?.allowLeavesBeforeHoliday ?? true,
      allowLeavesAfterHoliday: variant?.allowLeavesAfterHoliday ?? true,
      allowClubbing: variant?.allowClubbing ?? true,
      supportingDocuments: variant?.supportingDocuments || false,
      supportingDocumentsText: variant?.supportingDocumentsText || "",
      allowDuringNotice: variant?.allowDuringNotice ?? true,
      requiresWorkflow: variant?.requiresWorkflow ?? true,
      leaveBalanceDeduction: variant?.leaveBalanceDeductionBefore ? "before_workflow" : 
                                 variant?.leaveBalanceDeductionAfter ? "after_workflow" : 
                                 "before_workflow",
      gracePeriod: variant?.gracePeriod || 0,
      allowWithdrawalBeforeApproval: variant?.allowWithdrawalBeforeApproval ?? true,
      allowWithdrawalAfterApproval: variant?.allowWithdrawalAfterApproval || false,
      allowWithdrawalNotAllowed: variant?.allowWithdrawalNotAllowed || false,
      negativeLeaveBalance: variant?.negativeLeaveBalance || 0,
      carryForwardLimit: variant?.carryForwardLimit || 0,
      carryForwardPeriod: variant?.carryForwardPeriod || "month",
      encashment: variant?.encashment || false,
      encashmentCalculation: variant?.encashmentCalculation || "basic_da",
      maxEncashmentDays: variant?.maxEncashmentDays === 1000 ? -1 : (variant?.maxEncashmentDays || 0),
      encashmentTiming: variant?.encashmentTiming || "exit_retirement",
      allowApplicationsOnBehalf: variant?.allowApplicationsOnBehalf ?? true,
      showAvailedLeaves: variant?.showAvailedLeaves ?? false,
      showBalanceLeaves: variant?.showBalanceLeaves ?? false,
      maximumBalance: variant?.maximumBalance || 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("=== MUTATION FUNCTION STARTED ===");
      console.log("Mutation data received:", data);
      console.log("variant?.id:", variant?.id);
      console.log("Is this an update?", !!variant?.id);
      
      // Processing form submission
      // Process leave type validation
      
      // If leaveType doesn't have an ID, we need to create it first
      let finalLeaveTypeId = variant?.leaveTypeId || leaveType.id;
      
      if (!finalLeaveTypeId) {
        // Checking if leave type exists first
        
        // Check if leave type already exists
        const existingTypesResponse = await fetch("/api/leave-types", {
          headers: {
            "X-Org-Id": localStorage.getItem('org_id') || '60',
          },
          credentials: "include",
        });
        const existingTypes = await existingTypesResponse.json();
        const existingType = existingTypes.find((type: any) => type.name === leaveType.name);
        
        if (existingType) {
          finalLeaveTypeId = existingType.id;
        } else {
          const response = await apiRequest("POST", "/api/leave-types", {
            name: leaveType.name,
            icon: leaveType.icon,
            color: leaveType.color,
            annualAllowance: 12,
            carryForward: false,
            isActive: true
          });
          const createdLeaveType = await response.json();
          finalLeaveTypeId = createdLeaveType.id;
        }
      }
      
      // Final leave type ID determined
      
      const variantData = {
        leaveTypeId: finalLeaveTypeId,
        leaveTypeName: leaveType.name,
        leaveVariantName: data.leaveVariantName,
        description: data.description,
        minimumLeaveUnit: data.minimumLeaveUnit,
        leavesGrantedOn: data.leavesGrantedOn,
        paidDaysInYear: data.paidDaysInYear,
        complianceGrantDays: data.complianceGrantDays,
        complianceForEveryDays: data.complianceForEveryDays,
        grantLeaves: data.grantLeaves,
        grantFrequency: data.grantFrequency,
        proRataCalculation: data.proRataCalculation,
        onboardingSlabs: data.onboardingSlabs,
        exitSlabs: data.exitSlabs,
        fractionalLeaves: data.fractionalLeaves,
        applicableGenders: data.applicableGenders,
        applicableAfter: data.applicableAfter,
        applicableAfterType: data.applicableAfterType,
        mustBePlannedInAdvance: data.mustBePlannedInAdvance,
        maxDaysInStretch: data.maxDaysInStretch,
        minDaysRequired: data.minDaysRequired,
        maxInstances: data.maxInstances,
        maxInstancesPeriod: data.maxInstancesPeriod,
        allowLeavesBeforeWeekend: data.allowLeavesBeforeWeekend,
        allowLeavesBeforeHoliday: data.allowLeavesBeforeHoliday,
        allowClubbing: data.allowClubbing,
        supportingDocuments: data.supportingDocuments,
        supportingDocumentsText: data.supportingDocumentsText,
        allowDuringNotice: data.allowDuringNotice,
        requiresWorkflow: data.requiresWorkflow,
        leaveBalanceDeductionBefore: data.leaveBalanceDeduction === "before_workflow",
        leaveBalanceDeductionAfter: data.leaveBalanceDeduction === "after_workflow",
        leaveBalanceDeductionNotAllowed: false,
        gracePeriod: data.gracePeriod,
        allowWithdrawalBeforeApproval: data.allowWithdrawalBeforeApproval,
        allowWithdrawalAfterApproval: data.allowWithdrawalAfterApproval,
        allowWithdrawalNotAllowed: data.allowWithdrawalNotAllowed,
        negativeLeaveBalance: data.negativeLeaveBalance,
        carryForwardLimit: data.carryForwardLimit,
        carryForwardPeriod: data.carryForwardPeriod,
        encashment: data.encashment,
        encashmentCalculation: data.encashmentCalculation,
        maxEncashmentDays: data.maxEncashmentDays === -1 ? 1000 : data.maxEncashmentDays,
        encashmentTiming: data.encashmentTiming,
        allowApplicationsOnBehalf: data.allowApplicationsOnBehalf,
        showAvailedLeaves: data.showAvailedLeaves,
        showBalanceLeaves: data.showBalanceLeaves,
        maximumBalance: data.maximumBalance
      };

      console.log("About to make API request...");
      console.log("Request type:", variant?.id ? "PATCH" : "POST");
      console.log("URL:", variant?.id ? `/api/leave-variants/${variant.id}` : "/api/leave-variants");
      console.log("Variant data being sent:", JSON.stringify(variantData, null, 2));

      const result = variant?.id 
        ? await apiRequest("PATCH", `/api/leave-variants/${variant.id}`, variantData)
        : await apiRequest("POST", "/api/leave-variants", variantData);
        
      console.log("API request completed successfully");
      console.log("Response:", result);
        
      // Handle employee assignments for new variants
      if (!variant?.id) {
        const resultJson = await result.json();
        const newVariantId = resultJson.id;

        
        const currentAssignedEmployees = pendingEmployeeAssignments.length > 0 ? pendingEmployeeAssignments : assignedEmployeesRef.current;
        // Employee assignment handling
        
        if (currentAssignedEmployees.length > 0 && newVariantId) {
          const assignments = currentAssignedEmployees.map(emp => {
            const userId = emp.user_id || emp.id || emp.userId;
            return {
              userId: userId,
              leaveVariantId: newVariantId,
              assignmentType: "leave_variant"
            };
          }).filter(assignment => assignment.userId);
          try {
            await apiRequest("POST", "/api/employee-assignments/bulk", { assignments });
            pendingEmployeeAssignments = [];
          } catch (error) {
            console.error("Failed to create employee assignments:", error);
            throw error;
          }
        }
        return resultJson;
      } else {
        // For updates, just return the result
        return await result.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-assignments"] });
      toast({
        title: "Success",
        description: `${leaveType.name} variant has been ${variant?.id ? 'updated' : 'created'} successfully.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Leave config error:", error);
      toast({
        title: "Error",
        description: "Failed to configure leave type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!variant?.id) throw new Error("No variant to delete");
      return await apiRequest("DELETE", `/api/leave-variants/${variant.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      toast({
        title: "Success",
        description: `${leaveType.name} variant has been deleted successfully.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Delete variant error:", error);
      toast({
        title: "Error",
        description: "Failed to delete variant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validate required fields first
    if (!data.leaveVariantName || data.leaveVariantName.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Leave Variant Name is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.description || data.description.trim() === '') {
      toast({
        title: "Validation Error", 
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate supporting documents text when supporting documents are required
    if (data.supportingDocuments && (!data.supportingDocumentsText || data.supportingDocumentsText.trim() === '')) {
      toast({
        title: "Validation Error",
        description: "Supporting documents text is required when supporting documents are enabled.",
        variant: "destructive",
      });
      return;
    }
    
    // Log all form validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("=== FORM VALIDATION ERRORS DETECTED ===");
      Object.entries(form.formState.errors).forEach(([field, error]) => {
        console.log(`Field "${field}" error:`, error);
      });
      console.log("=== END FORM VALIDATION ERRORS ===");
      return; // STOP HERE IF VALIDATION ERRORS EXIST
    }
    
    // FOR UPDATE: Skip validation and proceed directly for existing variants
    if (variant?.id) {
      console.log("BYPASS: This is an update operation, proceeding directly to mutation");
      console.log("About to call mutation.mutate with data:", JSON.stringify(data, null, 2));
      mutation.mutate(data);
      return;
    }
    
    // Validate slabs when slab system is selected
    if (data.proRataCalculation === "slab_system") {
      const hasOnboardingSlabs = data.onboardingSlabs && data.onboardingSlabs.length > 0;
      const hasExitSlabs = data.exitSlabs && data.exitSlabs.length > 0;
      
      if (!hasOnboardingSlabs && !hasExitSlabs) {
        toast({
          title: "Validation Error",
          description: "Please add at least one slab in either Onboarding or Exits tab when using Slab System.",
          variant: "destructive",
        });
        return;
      }
      
      // Get maximum days based on leave granting method
      const maxDaysInMonth = data.leavesGrantedOn === "calendar_days" ? 31 : 30; // Calendar days: max 31, Working days: typically 30
      
      // Check if all onboarding slabs have valid values
      if (hasOnboardingSlabs) {
        for (let i = 0; i < data.onboardingSlabs!.length; i++) {
          const slab = data.onboardingSlabs![i];
          
          // Check for blank/missing values
          if (!slab.fromDay || !slab.toDay || slab.earnDays === undefined || slab.earnDays === null) {
            toast({
              title: "Validation Error", 
              description: `Onboarding Slab ${i + 1}: All fields (From Day, To Day, Earn Days) must be filled.`,
              variant: "destructive",
            });
            return;
          }
          
          // Check earn days is not negative
          if (slab.earnDays < 0) {
            toast({
              title: "Validation Error", 
              description: `Onboarding Slab ${i + 1}: Earn days cannot be negative.`,
              variant: "destructive",
            });
            return;
          }
          
          // Check day range validity
          if (slab.fromDay < 1 || slab.fromDay > maxDaysInMonth) {
            toast({
              title: "Validation Error", 
              description: `Onboarding Slab ${i + 1}: From Day must be between 1 and ${maxDaysInMonth} (based on ${data.leavesGrantedOn === "calendar_days" ? "calendar days" : "working days"}).`,
              variant: "destructive",
            });
            return;
          }
          
          if (slab.toDay < 1 || slab.toDay > maxDaysInMonth) {
            toast({
              title: "Validation Error", 
              description: `Onboarding Slab ${i + 1}: To Day must be between 1 and ${maxDaysInMonth} (based on ${data.leavesGrantedOn === "calendar_days" ? "calendar days" : "working days"}).`,
              variant: "destructive",
            });
            return;
          }
          
          // Check that fromDay <= toDay
          if (slab.fromDay > slab.toDay) {
            toast({
              title: "Validation Error", 
              description: `Onboarding Slab ${i + 1}: From Day cannot be greater than To Day.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
      
      // Check if all exit slabs have valid values
      if (hasExitSlabs) {
        for (let i = 0; i < data.exitSlabs!.length; i++) {
          const slab = data.exitSlabs![i];
          
          // Check for blank/missing values
          if (!slab.fromDay || !slab.toDay || slab.earnDays === undefined || slab.earnDays === null) {
            toast({
              title: "Validation Error", 
              description: `Exit Slab ${i + 1}: All fields (From Day, To Day, Earn Days) must be filled.`,
              variant: "destructive",
            });
            return;
          }
          
          // Check earn days is not negative
          if (slab.earnDays < 0) {
            toast({
              title: "Validation Error", 
              description: `Exit Slab ${i + 1}: Earn days cannot be negative.`,
              variant: "destructive",
            });
            return;
          }
          
          // Check day range validity
          if (slab.fromDay < 1 || slab.fromDay > maxDaysInMonth) {
            toast({
              title: "Validation Error", 
              description: `Exit Slab ${i + 1}: From Day must be between 1 and ${maxDaysInMonth} (based on ${data.leavesGrantedOn === "calendar_days" ? "calendar days" : "working days"}).`,
              variant: "destructive",
            });
            return;
          }
          
          if (slab.toDay < 1 || slab.toDay > maxDaysInMonth) {
            toast({
              title: "Validation Error", 
              description: `Exit Slab ${i + 1}: To Day must be between 1 and ${maxDaysInMonth} (based on ${data.leavesGrantedOn === "calendar_days" ? "calendar days" : "working days"}).`,
              variant: "destructive",
            });
            return;
          }
          
          // Check that fromDay <= toDay
          if (slab.fromDay > slab.toDay) {
            toast({
              title: "Validation Error", 
              description: `Exit Slab ${i + 1}: From Day cannot be greater than To Day.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
      
      // Validate that total slab earnings don't exceed allocation based on grant frequency
      if (data.paidDaysInYear && data.grantFrequency) {
        let maxEarnDaysPerSlab = 0;
        
        switch (data.grantFrequency) {
          case "per_month":
            maxEarnDaysPerSlab = data.paidDaysInYear / 12;
            break;
          case "per_quarter":
            maxEarnDaysPerSlab = data.paidDaysInYear / 4;
            break;
          case "per_half_year":
            maxEarnDaysPerSlab = data.paidDaysInYear / 2;
            break;
          case "per_year":
            maxEarnDaysPerSlab = data.paidDaysInYear;
            break;
          default:
            maxEarnDaysPerSlab = data.paidDaysInYear;
        }
        
        // Check onboarding slabs
        if (hasOnboardingSlabs) {
          for (let i = 0; i < data.onboardingSlabs!.length; i++) {
            const slab = data.onboardingSlabs![i];
            if (slab.earnDays && slab.earnDays > maxEarnDaysPerSlab) {
              toast({
                title: "Validation Error",
                description: `Onboarding Slab ${i + 1}: Cannot earn ${slab.earnDays} days. Maximum allowed per ${data.grantFrequency.replace('per_', '')} is ${maxEarnDaysPerSlab.toFixed(2)} days (${data.paidDaysInYear} days ÷ ${data.grantFrequency === 'per_month' ? '12' : data.grantFrequency === 'per_quarter' ? '4' : data.grantFrequency === 'per_half_year' ? '2' : '1'}).`,
                variant: "destructive",
              });
              return;
            }
          }
        }
        
        // Check exit slabs
        if (hasExitSlabs) {
          for (let i = 0; i < data.exitSlabs!.length; i++) {
            const slab = data.exitSlabs![i];
            if (slab.earnDays && slab.earnDays > maxEarnDaysPerSlab) {
              toast({
                title: "Validation Error",
                description: `Exit Slab ${i + 1}: Cannot earn ${slab.earnDays} days. Maximum allowed per ${data.grantFrequency.replace('per_', '')} is ${maxEarnDaysPerSlab.toFixed(2)} days (${data.paidDaysInYear} days ÷ ${data.grantFrequency === 'per_month' ? '12' : data.grantFrequency === 'per_quarter' ? '4' : data.grantFrequency === 'per_half_year' ? '2' : '1'}).`,
                variant: "destructive",
              });
              return;
            }
          }
        }
      }
      
      // Check for overlapping date ranges in onboarding slabs
      if (hasOnboardingSlabs && data.onboardingSlabs!.length > 1) {
        for (let i = 0; i < data.onboardingSlabs!.length; i++) {
          const currentSlab = data.onboardingSlabs![i];
          for (let j = i + 1; j < data.onboardingSlabs!.length; j++) {
            const otherSlab = data.onboardingSlabs![j];
            
            // Check if ranges overlap
            if (currentSlab.fromDay && currentSlab.toDay && otherSlab.fromDay && otherSlab.toDay) {
              const overlap = (currentSlab.fromDay <= otherSlab.toDay && currentSlab.toDay >= otherSlab.fromDay);
              if (overlap) {
                toast({
                  title: "Validation Error",
                  description: `Onboarding Slabs ${i + 1} and ${j + 1} have overlapping date ranges (${currentSlab.fromDay}-${currentSlab.toDay} overlaps with ${otherSlab.fromDay}-${otherSlab.toDay}). Each day can only belong to one slab.`,
                  variant: "destructive",
                });
                return;
              }
            }
          }
        }
      }
      
      // Check for overlapping date ranges in exit slabs
      if (hasExitSlabs && data.exitSlabs!.length > 1) {
        for (let i = 0; i < data.exitSlabs!.length; i++) {
          const currentSlab = data.exitSlabs![i];
          for (let j = i + 1; j < data.exitSlabs!.length; j++) {
            const otherSlab = data.exitSlabs![j];
            
            // Check if ranges overlap
            if (currentSlab.fromDay && currentSlab.toDay && otherSlab.fromDay && otherSlab.toDay) {
              const overlap = (currentSlab.fromDay <= otherSlab.toDay && currentSlab.toDay >= otherSlab.fromDay);
              if (overlap) {
                toast({
                  title: "Validation Error",
                  description: `Exit Slabs ${i + 1} and ${j + 1} have overlapping date ranges (${currentSlab.fromDay}-${currentSlab.toDay} overlaps with ${otherSlab.fromDay}-${otherSlab.toDay}). Each day can only belong to one slab.`,
                  variant: "destructive",
                });
                return;
              }
            }
          }
        }
      }
      
      // Check complete month coverage for onboarding slabs
      if (hasOnboardingSlabs && data.onboardingSlabs!.length > 0) {
        const coveredDays = new Set<number>();
        
        // Collect all covered days
        for (const slab of data.onboardingSlabs!) {
          if (slab.fromDay && slab.toDay) {
            for (let day = slab.fromDay; day <= slab.toDay; day++) {
              coveredDays.add(day);
            }
          }
        }
        
        // Check if all days 1-31 are covered
        const missingDays: number[] = [];
        for (let day = 1; day <= 31; day++) {
          if (!coveredDays.has(day)) {
            missingDays.push(day);
          }
        }
        
        if (missingDays.length > 0) {
          toast({
            title: "Validation Error",
            description: `Onboarding slabs must cover all days of the month (1st-31st). Missing coverage for days: ${missingDays.join(', ')}. Please adjust your slab ranges to ensure complete month coverage.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check complete month coverage for exit slabs
      if (hasExitSlabs && data.exitSlabs!.length > 0) {
        const coveredDays = new Set<number>();
        
        // Collect all covered days
        for (const slab of data.exitSlabs!) {
          if (slab.fromDay && slab.toDay) {
            for (let day = slab.fromDay; day <= slab.toDay; day++) {
              coveredDays.add(day);
            }
          }
        }
        
        // Check if all days 1-31 are covered
        const missingDays: number[] = [];
        for (let day = 1; day <= 31; day++) {
          if (!coveredDays.has(day)) {
            missingDays.push(day);
          }
        }
        
        if (missingDays.length > 0) {
          toast({
            title: "Validation Error",
            description: `Exit slabs must cover all days of the month (1st-31st). Missing coverage for days: ${missingDays.join(', ')}. Please adjust your slab ranges to ensure complete month coverage.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Validate encashment fields when encashment is enabled
    if (data.encashment) {
      if (!data.encashmentCalculation) {
        toast({
          title: "Validation Error",
          description: "Please select how to calculate en-cashment.",
          variant: "destructive",
        });
        return;
      }
      
      // Check maxEncashmentDays: must be defined and either positive number or -1 for "No Limit"
      if (data.maxEncashmentDays === undefined || data.maxEncashmentDays === null || (data.maxEncashmentDays <= 0 && data.maxEncashmentDays !== -1)) {
        toast({
          title: "Validation Error",
          description: "Please enter maximum days that can be en-cashed.",
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log("All validations passed, calling mutation.mutate");
    mutation.mutate(data);
  };

  // Debug function to check form state
  const logFormErrors = () => {
    console.log("=== FORM ERRORS DEBUG ===");
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form values:", form.getValues());
    console.log("minimumLeaveUnit value:", form.getValues("minimumLeaveUnit"));
    console.log("minimumLeaveUnit type:", typeof form.getValues("minimumLeaveUnit"));
    console.log("minimumLeaveUnit is array:", Array.isArray(form.getValues("minimumLeaveUnit")));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center p-6 border-b">
          <Button variant="ghost" size="sm" onClick={onClose} className="mr-4">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${leaveType.color}20` }}
            >
              <Smile className="w-4 h-4" style={{ color: leaveType.color }} />
            </div>
            <h2 className="text-xl font-semibold">{leaveType.name}</h2>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-180px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8 pb-12">
              
              {/* Minimum leave unit */}
              <Card>
                <CardHeader>
                  <CardTitle>Minimum leave unit *</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="minimumLeaveUnit"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex space-x-4">
                          {[
                            { value: "full_day" as const, label: "Full Day" },
                            { value: "half_day" as const, label: "Half Day" }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <Checkbox
                                checked={Array.isArray(field.value) ? field.value.includes(option.value as "full_day" | "half_day") : field.value === option.value}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const currentValue = Array.isArray(field.value) ? field.value : [field.value].filter(Boolean);
                                    field.onChange([...currentValue, option.value]);
                                  } else {
                                    const currentValue = Array.isArray(field.value) ? field.value : [field.value].filter(Boolean);
                                    field.onChange(currentValue.filter((v) => v !== option.value));
                                  }
                                }}
                              />
                              <span>{option.label}</span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Leave Variant Name */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="leaveVariantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Variant Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="eg. For Factory Employees in Karnataka" {...field} />
                      </FormControl>
                      <p className="text-sm text-gray-600">Create tailored leave policies for specific groups of employees using variants</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="eg. It's essential to rest and recover when you are sick. Use your sick leaves accordingly."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Leave granting */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave granting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="leavesGrantedOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leaves will be granted based on</FormLabel>
                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            variant={field.value === "calendar_days" ? "default" : "outline"}
                            onClick={() => field.onChange("calendar_days")}
                            className={field.value === "calendar_days" ? "bg-green-600" : ""}
                          >
                            Calendar Days
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "compliance" ? "default" : "outline"}
                            onClick={() => field.onChange("compliance")}
                            className={field.value === "compliance" ? "bg-green-600" : ""}
                          >
                            Compliance
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Compliance Fields */}
                  {form.watch("leavesGrantedOn") === "compliance" && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-4">
                        <FormField
                          control={form.control}
                          name="complianceGrantDays"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center space-x-2">
                                <FormLabel className="text-gray-600">Grants</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1"
                                    min="0"
                                    {...field}
                                    onChange={e => {
                                      const value = parseFloat(e.target.value) || 0;
                                      field.onChange(value >= 0 ? value : 0);
                                    }}
                                    className="w-20"
                                  />
                                </FormControl>
                                <span className="text-gray-600">(days)</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="complianceForEveryDays"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center space-x-2">
                                <FormLabel className="text-gray-600">For every</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field}
                                    onChange={e => {
                                      const value = parseInt(e.target.value) || 0;
                                      field.onChange(value >= 0 ? value : 0);
                                    }}
                                    className="w-20"
                                  />
                                </FormControl>
                                <span className="text-gray-600">(days) Worked</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hide these fields when Compliance is selected */}
                  {form.watch("leavesGrantedOn") !== "compliance" && (
                    <>
                      <FormField
                        control={form.control}
                        name="paidDaysInYear"
                        render={({ field }) => {
                          const minimumLeaveUnit = form.watch("minimumLeaveUnit") || [];
                          const allowsHalfDay = minimumLeaveUnit.includes("half_day");
                          
                          return (
                            <FormItem>
                              <FormLabel>Paid days in a year *</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Input 
                                    type="number" 
                                    step={allowsHalfDay ? "0.5" : "1"}
                                    min="0"
                                    {...field}
                                    onChange={e => {
                                      let value = parseFloat(e.target.value) || 0;
                                      // If half day is not allowed, round to nearest integer
                                      if (!allowsHalfDay) {
                                        value = Math.round(value);
                                      }
                                      field.onChange(value);
                                    }}
                                    className="w-24"
                                  />
                                  <span className="text-gray-500">(days)</span>
                                </div>
                              </FormControl>
                              {!allowsHalfDay && (
                                <p className="text-xs text-gray-500">
                                  Only whole numbers allowed. Select "Half Day" in minimum leave unit to allow decimal values.
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="grantLeaves"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grant Leaves</FormLabel>
                            <div className="flex space-x-4">
                              <Button
                                type="button"
                                variant={field.value === "in_advance" ? "default" : "outline"}
                                onClick={() => field.onChange("in_advance")}
                                className={field.value === "in_advance" ? "bg-green-600" : ""}
                              >
                                In Advance
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "after_earning" ? "default" : "outline"}
                                onClick={() => field.onChange("after_earning")}
                              >
                                After Earning
                              </Button>
                              <Select value={form.watch("grantFrequency")} onValueChange={(value) => form.setValue("grantFrequency", value as any)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="per_month">Per Month</SelectItem>
                                  <SelectItem value="per_quarter">Per Quarter</SelectItem>
                                  <SelectItem value="per_half_year">Per Half Year</SelectItem>
                                  <SelectItem value="per_year">Per Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pro-Rata Calculations - Hide when Compliance is selected */}
              {form.watch("leavesGrantedOn") !== "compliance" && (
                <Card>
                <CardHeader>
                  <CardTitle>Pro-Rata Calculations</CardTitle>
                  <p className="text-sm text-gray-600">
                    Adjust how you would like the employees to earn the leaves. This ensures fair allocation of benefits, especially for new hires or employees leaving mid-year.
                  </p>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="proRataCalculation"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            {
                              value: "full_month",
                              title: "Full Month",
                              description: "Consider the entire month as worked for earned leaves, regardless of actual days worked."
                            },
                            {
                              value: "slab_system",
                              title: "Slab System",
                              description: "Calculate pro-rata benefits by dividing the month into equal periods (e.g., 1st-10th, 11th-20th) and determining the number of days worked within each period."
                            },
                            {
                              value: "rounding_off",
                              title: "Rounding Off",
                              description: "Round fractions of days worked to the nearest half or full day before calculating pro-rata benefits. This can be rounded up or down based on your organization's policy."
                            }
                          ].map((option) => (
                            <div 
                              key={option.value}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                field.value === option.value 
                                  ? 'border-green-600 bg-green-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => {
                                field.onChange(option.value);
                                watchProRataCalculation(option.value);
                              }}
                            >
                              <div className="flex items-start space-x-2">
                                <div className={`w-4 h-4 rounded border-2 mt-1 flex items-center justify-center ${
                                  field.value === option.value ? 'bg-green-600 border-green-600' : 'border-gray-300'
                                }`}>
                                  {field.value === option.value && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{option.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Slab System Configuration */}
                  {form.watch("proRataCalculation") === "slab_system" && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Set Slabs *</h4>
                      
                      {/* Slab Validation Error Display */}
                      {form.formState.errors?.slabs && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                Slab Configuration Error
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                {form.formState.errors.slabs.message}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-2">📅 Day-of-Month Based Slabs</p>
                          <p className="text-xs">Create slabs based on specific days of the month (1st-31st) that apply every year. For example, employees joining between the 1st-15th earn different amounts than those joining 16th-31st.</p>
                        </div>
                      </div>
                      
                      {/* Tabs for Onboarding and Exits */}
                      <Tabs defaultValue="onboarding" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                          <TabsTrigger value="exits">Exits</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="onboarding" className="space-y-4 mt-4">
                          <div className="text-sm text-gray-600 mb-4">
                            Configure leave earning slabs for employees joining during the year
                          </div>
                          
                          {/* Onboarding Slabs */}
                          <div className="space-y-4">
                            {form.watch("onboardingSlabs")?.map((slab, index) => (
                              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium">Onboarding Slab {index + 1}</span>
                                  {form.watch("onboardingSlabs")!.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => {
                                        const slabs = form.getValues("onboardingSlabs")?.filter((_, i) => i !== index) || [];
                                        form.setValue("onboardingSlabs", slabs);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm font-medium whitespace-nowrap">From (Day of Month) *</label>
                                      <Select
                                        value={slab.fromDay?.toString() || ""}
                                        onValueChange={(value) => {
                                          const slabs = [...(form.getValues("onboardingSlabs") || [])];
                                          slabs[index] = { ...slabs[index], fromDay: parseInt(value) };
                                          form.setValue("onboardingSlabs", slabs);
                                        }}
                                      >
                                        <SelectTrigger className={`w-20 ${!slab.fromDay ? 'border-red-300' : ''}`}>
                                          <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: form.watch("leavesGrantedOn") === "calendar_days" ? 31 : 30 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {!slab.fromDay && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm font-medium whitespace-nowrap">To (Day of Month) *</label>
                                      <Select
                                        value={slab.toDay?.toString() || ""}
                                        onValueChange={(value) => {
                                          const slabs = [...(form.getValues("onboardingSlabs") || [])];
                                          slabs[index] = { ...slabs[index], toDay: parseInt(value) };
                                          form.setValue("onboardingSlabs", slabs);
                                        }}
                                      >
                                        <SelectTrigger className={`w-20 ${!slab.toDay ? 'border-red-300' : ''}`}>
                                          <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: form.watch("leavesGrantedOn") === "calendar_days" ? 31 : 30 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {!slab.toDay && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm whitespace-nowrap">Employee will earn *</span>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        className={`w-20 ${(slab.earnDays === undefined || slab.earnDays === null || slab.earnDays < 0) ? 'border-red-300' : ''}`}
                                        value={slab.earnDays || ""}
                                        onChange={(e) => {
                                          const slabs = [...(form.getValues("onboardingSlabs") || [])];
                                          const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                          slabs[index] = { ...slabs[index], earnDays: value >= 0 ? value : 0 };
                                          form.setValue("onboardingSlabs", slabs);
                                        }}
                                      />
                                      <span className="text-sm">days</span>
                                      {(slab.earnDays === undefined || slab.earnDays === null) && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                  </div>
                                  
                                  {/* Validation warnings */}
                                  {slab.fromDay && slab.toDay && slab.fromDay > slab.toDay && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                      Error: From Day cannot be greater than To Day
                                    </div>
                                  )}
                                  
                                  {form.watch("leavesGrantedOn") === "calendar_days" && slab.toDay && slab.toDay > 31 && (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                      Warning: Day {slab.toDay} may not exist in all months
                                    </div>
                                  )}
                                  
                                  {/* Earn days validation warning for onboarding */}
                                  {(() => {
                                    const paidDays = form.watch("paidDaysInYear");
                                    const grantFreq = form.watch("grantFrequency");
                                    if (paidDays && grantFreq && slab.earnDays) {
                                      let maxEarnDays = 0;
                                      switch (grantFreq) {
                                        case "per_month": maxEarnDays = paidDays / 12; break;
                                        case "per_quarter": maxEarnDays = paidDays / 4; break;
                                        case "per_half_year": maxEarnDays = paidDays / 2; break;
                                        case "per_year": maxEarnDays = paidDays; break;
                                        default: maxEarnDays = paidDays;
                                      }
                                      if (slab.earnDays > maxEarnDays) {
                                        return (
                                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                            Error: Cannot earn {slab.earnDays} days. Maximum allowed per {grantFreq.replace('per_', '')} is {maxEarnDays.toFixed(2)} days ({paidDays} ÷ {grantFreq === 'per_month' ? '12' : grantFreq === 'per_quarter' ? '4' : grantFreq === 'per_half_year' ? '2' : '1'})
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Date range overlap validation for onboarding */}
                                  {(() => {
                                    const currentSlabs = form.watch("onboardingSlabs") || [];
                                    const overlappingSlabs = currentSlabs.filter((otherSlab, otherIndex) => {
                                      if (otherIndex === index || !otherSlab.fromDay || !otherSlab.toDay || !slab.fromDay || !slab.toDay) return false;
                                      // Check if ranges overlap
                                      return (slab.fromDay <= otherSlab.toDay && slab.toDay >= otherSlab.fromDay);
                                    });
                                    
                                    if (overlappingSlabs.length > 0) {
                                      return (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                          Error: Date range {slab.fromDay}-{slab.toDay} overlaps with another slab. Each day can only belong to one slab.
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            ))}
                            
                            {/* Month coverage validation warning for onboarding */}
                            {(() => {
                              const currentSlabs = form.watch("onboardingSlabs") || [];
                              if (currentSlabs.length > 0) {
                                const coveredDays = new Set<number>();
                                
                                // Collect all covered days
                                for (const slab of currentSlabs) {
                                  if (slab.fromDay && slab.toDay) {
                                    for (let day = slab.fromDay; day <= slab.toDay; day++) {
                                      coveredDays.add(day);
                                    }
                                  }
                                }
                                
                                // Check for missing days
                                const missingDays: number[] = [];
                                for (let day = 1; day <= 31; day++) {
                                  if (!coveredDays.has(day)) {
                                    missingDays.push(day);
                                  }
                                }
                                
                                if (missingDays.length > 0) {
                                  return (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mb-3">
                                      <strong>Month Coverage Warning:</strong> Missing coverage for days: {missingDays.join(', ')}. 
                                      All days from 1st-31st must be covered by slabs to handle employees joining on any day of the month.
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const currentSlabs = form.getValues("onboardingSlabs") || [];
                                
                                // Find the next available day range to avoid overlaps
                                const occupiedDays = new Set<number>();
                                currentSlabs.forEach(slab => {
                                  if (slab.fromDay && slab.toDay) {
                                    for (let day = slab.fromDay; day <= slab.toDay; day++) {
                                      occupiedDays.add(day);
                                    }
                                  }
                                });
                                
                                // Find first available day
                                let startDay = 1;
                                while (startDay <= 31 && occupiedDays.has(startDay)) {
                                  startDay++;
                                }
                                
                                // Default to a reasonable range or remaining days
                                let endDay = Math.min(startDay + 14, 31); // 15-day default range
                                while (endDay <= 31 && occupiedDays.has(endDay)) {
                                  endDay++;
                                }
                                
                                // If no space available, use minimal range
                                if (startDay > 31) {
                                  startDay = 1;
                                  endDay = 1;
                                }
                                
                                form.setValue("onboardingSlabs", [...currentSlabs, { 
                                  fromDay: startDay, 
                                  toDay: endDay, 
                                  earnDays: 0 
                                }]);
                              }}
                            >
                              + Add Onboarding Slab
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="exits" className="space-y-4 mt-4">
                          <div className="text-sm text-gray-600 mb-4">
                            Configure leave earning slabs for employees exiting during the year
                          </div>
                          
                          {/* Exit Slabs */}
                          <div className="space-y-4">
                            {form.watch("exitSlabs")?.map((slab, index) => (
                              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium">Exit Slab {index + 1}</span>
                                  {form.watch("exitSlabs")!.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => {
                                        const slabs = form.getValues("exitSlabs")?.filter((_, i) => i !== index) || [];
                                        form.setValue("exitSlabs", slabs);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm font-medium whitespace-nowrap">From (Day of Month) *</label>
                                      <Select
                                        value={slab.fromDay?.toString() || ""}
                                        onValueChange={(value) => {
                                          const slabs = [...(form.getValues("exitSlabs") || [])];
                                          slabs[index] = { ...slabs[index], fromDay: parseInt(value) };
                                          form.setValue("exitSlabs", slabs);
                                        }}
                                      >
                                        <SelectTrigger className={`w-20 ${!slab.fromDay ? 'border-red-300' : ''}`}>
                                          <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: form.watch("leavesGrantedOn") === "calendar_days" ? 31 : 30 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {!slab.fromDay && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm font-medium whitespace-nowrap">To (Day of Month) *</label>
                                      <Select
                                        value={slab.toDay?.toString() || ""}
                                        onValueChange={(value) => {
                                          const slabs = [...(form.getValues("exitSlabs") || [])];
                                          slabs[index] = { ...slabs[index], toDay: parseInt(value) };
                                          form.setValue("exitSlabs", slabs);
                                        }}
                                      >
                                        <SelectTrigger className={`w-20 ${!slab.toDay ? 'border-red-300' : ''}`}>
                                          <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: form.watch("leavesGrantedOn") === "calendar_days" ? 31 : 30 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {!slab.toDay && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm whitespace-nowrap">Employee will earn *</span>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        className={`w-20 ${(slab.earnDays === undefined || slab.earnDays === null || slab.earnDays < 0) ? 'border-red-300' : ''}`}
                                        value={slab.earnDays || ""}
                                        onChange={(e) => {
                                          const slabs = [...(form.getValues("exitSlabs") || [])];
                                          const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                          slabs[index] = { ...slabs[index], earnDays: value >= 0 ? value : 0 };
                                          form.setValue("exitSlabs", slabs);
                                        }}
                                      />
                                      <span className="text-sm">days</span>
                                      {(slab.earnDays === undefined || slab.earnDays === null) && <span className="text-xs text-red-500">Required</span>}
                                    </div>
                                  </div>
                                  
                                  {/* Validation warnings */}
                                  {slab.fromDay && slab.toDay && slab.fromDay > slab.toDay && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                      Error: From Day cannot be greater than To Day
                                    </div>
                                  )}
                                  
                                  {form.watch("leavesGrantedOn") === "calendar_days" && slab.toDay && slab.toDay > 31 && (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                      Warning: Day {slab.toDay} may not exist in all months
                                    </div>
                                  )}
                                  
                                  {/* Earn days validation warning for exits */}
                                  {(() => {
                                    const paidDays = form.watch("paidDaysInYear");
                                    const grantFreq = form.watch("grantFrequency");
                                    if (paidDays && grantFreq && slab.earnDays) {
                                      let maxEarnDays = 0;
                                      switch (grantFreq) {
                                        case "per_month": maxEarnDays = paidDays / 12; break;
                                        case "per_quarter": maxEarnDays = paidDays / 4; break;
                                        case "per_year": maxEarnDays = paidDays; break;
                                        default: maxEarnDays = paidDays;
                                      }
                                      if (slab.earnDays > maxEarnDays) {
                                        return (
                                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                            Error: Cannot earn {slab.earnDays} days. Maximum allowed per {grantFreq.replace('per_', '')} is {maxEarnDays.toFixed(2)} days ({paidDays} ÷ {grantFreq === 'per_month' ? '12' : grantFreq === 'per_quarter' ? '4' : '1'})
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Date range overlap validation for exits */}
                                  {(() => {
                                    const currentSlabs = form.watch("exitSlabs") || [];
                                    const overlappingSlabs = currentSlabs.filter((otherSlab, otherIndex) => {
                                      if (otherIndex === index || !otherSlab.fromDay || !otherSlab.toDay || !slab.fromDay || !slab.toDay) return false;
                                      // Check if ranges overlap
                                      return (slab.fromDay <= otherSlab.toDay && slab.toDay >= otherSlab.fromDay);
                                    });
                                    
                                    if (overlappingSlabs.length > 0) {
                                      return (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                          Error: Date range {slab.fromDay}-{slab.toDay} overlaps with another slab. Each day can only belong to one slab.
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            ))}
                            
                            {/* Month coverage validation warning for exit slabs */}
                            {(() => {
                              const currentSlabs = form.watch("exitSlabs") || [];
                              if (currentSlabs.length > 0) {
                                const coveredDays = new Set<number>();
                                
                                // Collect all covered days
                                for (const slab of currentSlabs) {
                                  if (slab.fromDay && slab.toDay) {
                                    for (let day = slab.fromDay; day <= slab.toDay; day++) {
                                      coveredDays.add(day);
                                    }
                                  }
                                }
                                
                                // Check for missing days
                                const missingDays: number[] = [];
                                for (let day = 1; day <= 31; day++) {
                                  if (!coveredDays.has(day)) {
                                    missingDays.push(day);
                                  }
                                }
                                
                                if (missingDays.length > 0) {
                                  return (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mb-3">
                                      <strong>Month Coverage Warning:</strong> Missing coverage for days: {missingDays.join(', ')}. 
                                      All days from 1st-31st must be covered by slabs to handle employees leaving on any day of the month.
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const currentSlabs = form.getValues("exitSlabs") || [];
                                
                                // Find the next available day range to avoid overlaps
                                const occupiedDays = new Set<number>();
                                currentSlabs.forEach(slab => {
                                  if (slab.fromDay && slab.toDay) {
                                    for (let day = slab.fromDay; day <= slab.toDay; day++) {
                                      occupiedDays.add(day);
                                    }
                                  }
                                });
                                
                                // Find first available day
                                let startDay = 1;
                                while (startDay <= 31 && occupiedDays.has(startDay)) {
                                  startDay++;
                                }
                                
                                // Default to a reasonable range or remaining days
                                let endDay = Math.min(startDay + 14, 31); // 15-day default range
                                while (endDay <= 31 && occupiedDays.has(endDay)) {
                                  endDay++;
                                }
                                
                                // If no space available, use minimal range
                                if (startDay > 31) {
                                  startDay = 1;
                                  endDay = 1;
                                }
                                
                                form.setValue("exitSlabs", [...currentSlabs, { 
                                  fromDay: startDay, 
                                  toDay: endDay, 
                                  earnDays: 0 
                                }]);
                              }}
                            >
                              + Add Exit Slab
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                  
                  {/* Original Slab System (temporarily kept for compatibility) */}
                  {form.watch("proRataCalculation") === "slab_system" && false && (
                    <div className="mt-6">
                      <div className="space-y-4">
                        {form.watch("slabs")?.map((slab, index) => {
                          const paidDaysInYear = form.watch("paidDaysInYear") || 0;
                          const grantFrequency = form.watch("grantFrequency") || "per_month";
                          
                          let periodAllocation;
                          switch (grantFrequency) {
                            case "per_month":
                              periodAllocation = paidDaysInYear / 12;
                              break;
                            case "per_quarter":
                              periodAllocation = paidDaysInYear / 4;
                              break;
                            case "per_year":
                              periodAllocation = paidDaysInYear;
                              break;
                            default:
                              periodAllocation = paidDaysInYear / 12;
                          }
                          
                          const currentSlabs = form.watch("slabs") || [];
                          const totalEarnedDays = currentSlabs.reduce((sum: number, s: any) => sum + (parseFloat(s.earnDays) || 0), 0);
                          const exceedsLimit = totalEarnedDays > periodAllocation;
                          
                          return (
                            <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">Earn</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="0"
                                  className="w-20"
                                  value={slab.earnDays}
                                  onChange={(e) => {
                                    const slabs = [...(form.getValues("slabs") || [])];
                                    slabs[index] = { ...slabs[index], earnDays: parseFloat(e.target.value) || 0 };
                                    form.setValue("slabs", slabs);
                                  }}
                                />
                                <span className="text-sm">(days)</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">if employee works for at least</span>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className={`w-20 ${slab.daysWorked > 28 ? 'border-red-300 bg-red-50' : ''}`}
                                  value={slab.daysWorked}
                                  onChange={(e) => {
                                    const slabs = [...(form.getValues("slabs") || [])];
                                    slabs[index] = { ...slabs[index], daysWorked: parseInt(e.target.value) || 0 };
                                    form.setValue("slabs", slabs);
                                  }}
                                />
                                <span className="text-sm">(calendar days)</span>
                                {slab.daysWorked > 28 && (
                                  <span className="text-xs text-red-600 font-medium">
                                    ⚠️ Unachievable in February
                                  </span>
                                )}
                              </div>
                              {form.watch("slabs")!.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => {
                                    const slabs = form.getValues("slabs")?.filter((_, i) => i !== index) || [];
                                    form.setValue("slabs", slabs);
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-blue-600"
                          onClick={() => {
                            const currentSlabs = form.getValues("slabs") || [];
                            form.setValue("slabs", [...currentSlabs, { earnDays: 0, daysWorked: 0 }]);
                          }}
                        >
                          + Add slab
                        </Button>
                        
                        {/* Validation Summary */}
                        {(() => {
                          const paidDaysInYear = form.watch("paidDaysInYear") || 0;
                          const grantFrequency = form.watch("grantFrequency") || "per_month";
                          
                          let periodAllocation, periodName, divisor;
                          switch (grantFrequency) {
                            case "per_month":
                              periodAllocation = paidDaysInYear / 12;
                              periodName = "Monthly";
                              divisor = "12 months";
                              break;
                            case "per_quarter":
                              periodAllocation = paidDaysInYear / 4;
                              periodName = "Quarterly";
                              divisor = "4 quarters";
                              break;
                            case "per_year":
                              periodAllocation = paidDaysInYear;
                              periodName = "Yearly";
                              divisor = "1 year";
                              break;
                            default:
                              periodAllocation = paidDaysInYear / 12;
                              periodName = "Monthly";
                              divisor = "12 months";
                          }
                          
                          const currentSlabs = form.watch("slabs") || [];
                          const totalEarnedDays = currentSlabs.reduce((sum: number, s: any) => sum + (parseFloat(s.earnDays) || 0), 0);
                          const exceedsLimit = totalEarnedDays > periodAllocation;
                          
                          return (
                            <div className={`mt-4 p-4 rounded-lg border ${exceedsLimit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="font-medium">{periodName} Allocation: </span>
                                  <span className="text-blue-600">{periodAllocation.toFixed(2)} days</span>
                                  <span className="text-gray-500 ml-2">({paidDaysInYear} days ÷ {divisor})</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Total Earned Days: </span>
                                  <span className={exceedsLimit ? "text-red-600 font-bold" : "text-green-600"}>
                                    {totalEarnedDays.toFixed(2)} days
                                  </span>
                                </div>
                                {exceedsLimit && (
                                  <div className="text-sm text-red-600 font-semibold flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>
                                      Exceeds {periodName.toLowerCase()} allocation by {(totalEarnedDays - periodAllocation).toFixed(2)} days.
                                      Please reduce earned days in slabs.
                                    </span>
                                  </div>
                                )}
                                {!exceedsLimit && totalEarnedDays > 0 && (
                                  <div className="text-sm text-green-600 flex items-center gap-2">
                                    <span>✓</span>
                                    <span>Within {periodName.toLowerCase()} allocation limit</span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border">
                                  <strong>Business Logic Impact:</strong> Slab thresholds are based on <em>calendar days worked</em>.
                                  <br/>February (max 28/29 days), 30-day months (max 30 days), 31-day months (max 31 days).
                                  <br/><strong>Result:</strong> Thresholds &gt; 28 days will cause employees to earn 0 leaves in February.
                                  <br/><strong>Solution:</strong> Either keep thresholds ≤ 28 days OR implement proportional calculation in system logic.
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Fractional Leaves for Rounding Off */}
                  {form.watch("proRataCalculation") === "rounding_off" && (
                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="fractionalLeaves"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fractional leaves will be *</FormLabel>
                            <div className="flex space-x-4">
                              <Button
                                type="button"
                                variant={field.value === "rounded_up" ? "default" : "outline"}
                                onClick={() => field.onChange("rounded_up")}
                                className={field.value === "rounded_up" ? "bg-green-600" : ""}
                              >
                                Rounded Up
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "rounded_down" ? "default" : "outline"}
                                onClick={() => field.onChange("rounded_down")}
                                className={field.value === "rounded_down" ? "bg-green-600" : ""}
                              >
                                Rounded Down
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "normal_rounding" ? "default" : "outline"}
                                onClick={() => field.onChange("normal_rounding")}
                                className={field.value === "normal_rounding" ? "bg-green-600" : ""}
                              >
                                Normal Rounding
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Eligibility Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Criteria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="applicableGenders"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Applicable for the genders *</FormLabel>
                        <div className="flex space-x-4">
                          {["male", "female"].map((gender) => (
                            <div key={gender} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(gender as any)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, gender]);
                                  } else {
                                    field.onChange(field.value.filter(g => g !== gender));
                                  }
                                }}
                              />
                              <span className="capitalize">{gender}</span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Enhanced Applicable After Field with Three Options */}
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
                                <label htmlFor="probation_end" className="text-sm font-medium">
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
                                <label htmlFor="date_of_joining" className="text-sm font-medium">
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
                                <label htmlFor="days" className="text-sm font-medium">
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
                                            onChange={e => {
                                              const value = Number(e.target.value);
                                              daysField.onChange(value >= 0 ? value : 0);
                                            }}
                                            className="w-24"
                                            disabled={form.watch("applicableAfterType") !== "days"}
                                            placeholder="0"
                                          />
                                          <span className="text-gray-500">
                                            (days) from date of joining {form.watch("applicableAfter") === 0 ? "(immediate applicability)" : ""}
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

                  <FormField
                    control={form.control}
                    name="mustBePlannedInAdvance"
                    render={({ field }) => {
                      const hasGracePeriod = form.watch("gracePeriod") > 0;
                      
                      return (
                        <FormItem>
                          <FormLabel>Must be planned in advance by</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={e => {
                                  const value = Number(e.target.value);
                                  field.onChange(value >= 0 ? value : 0);
                                }}
                                className="w-24"
                                disabled={hasGracePeriod}
                              />
                              <span className="text-gray-500">(days)</span>
                            </div>
                          </FormControl>
                          {hasGracePeriod && (
                            <p className="text-xs text-orange-600">
                              Disabled because grace period is enabled. Only one can be active at a time.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="gracePeriod"
                    render={({ field }) => {
                      const hasAdvancePlanning = form.watch("mustBePlannedInAdvance") > 0;
                      
                      return (
                        <FormItem>
                          <FormLabel>Grace period for applying *</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={e => {
                                  const value = Number(e.target.value);
                                  field.onChange(value >= 0 ? value : 0);
                                }}
                                className="w-24"
                                disabled={hasAdvancePlanning}
                              />
                              <span className="text-gray-500">(days) if left empty, there is no grace period</span>
                            </div>
                          </FormControl>
                          {hasAdvancePlanning && (
                            <p className="text-xs text-orange-600">
                              Disabled because advance planning is enabled. Only one can be active at a time.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="maxDaysInStretch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max days in a stretch</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={e => {
                                const value = Number(e.target.value);
                                field.onChange(value >= 0 ? value : 0);
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-500">(days) if the value is 0, it is understood that there is no limit.</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minDaysRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min days required for a leave</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={e => {
                                const value = Number(e.target.value);
                                field.onChange(value >= 0 ? value : 0);
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-500">(days)</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxInstances"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max instances</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={e => {
                                const value = Number(e.target.value);
                                field.onChange(value >= 0 ? value : 0);
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-500">(applications) in a</span>
                            <Select value={form.watch("maxInstancesPeriod")} onValueChange={(value) => form.setValue("maxInstancesPeriod", value as any)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="month">Month</SelectItem>
                                <SelectItem value="quarter">Quarter</SelectItem>
                                <SelectItem value="year">Year</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-gray-500">if the value is 0, it is understood that there is no limit.</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Weekend and Holiday Rules - moved into Eligibility Criteria */}
                  {[
                    { name: "allowLeavesBeforeWeekend", label: "Leaves immediately before and after a weekend are" },
                    { name: "allowLeavesBeforeHoliday", label: "Leaves immediately before and after a holiday are" },
                    { name: "allowClubbing", label: "Clubbing with other leave types is" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={form.watch(item.name as any) ? "default" : "outline"}
                          onClick={() => form.setValue(item.name as any, true)}
                          className={form.watch(item.name as any) ? "bg-green-600" : ""}
                        >
                          Allowed
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={!form.watch(item.name as any) ? "default" : "outline"}
                          onClick={() => form.setValue(item.name as any, false)}
                          className={!form.watch(item.name as any) ? "bg-red-600" : ""}
                        >
                          Not Allowed
                        </Button>
                      </div>
                    </div>
                  ))}

                  <FormField
                    control={form.control}
                    name="supportingDocuments"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <span>Supporting documents are</span>
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={field.value ? "default" : "outline"}
                              onClick={() => field.onChange(true)}
                              className={field.value ? "bg-green-600" : ""}
                            >
                              Required
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={!field.value ? "default" : "outline"}
                              onClick={() => field.onChange(false)}
                              className={!field.value ? "bg-red-600" : ""}
                            >
                              Not Required
                            </Button>
                          </div>
                        </div>
                        {field.value && (
                          <FormField
                            control={form.control}
                            name="supportingDocumentsText"
                            render={({ field: textField }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter the details of the documents to be added. This message will be displayed to your employees while uploading documents."
                                    {...textField}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <span>During notice period, leaves are</span>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={form.watch("allowDuringNotice") ? "default" : "outline"}
                        onClick={() => form.setValue("allowDuringNotice", true)}
                        className={form.watch("allowDuringNotice") ? "bg-green-600" : ""}
                      >
                        Allowed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!form.watch("allowDuringNotice") ? "default" : "outline"}
                        onClick={() => form.setValue("allowDuringNotice", false)}
                        className={!form.watch("allowDuringNotice") ? "bg-red-600" : ""}
                      >
                        Not Allowed
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Does this require a review workflow for approval?</span>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={form.watch("requiresWorkflow") ? "default" : "outline"}
                        onClick={() => form.setValue("requiresWorkflow", true)}
                        className={form.watch("requiresWorkflow") ? "bg-green-600" : ""}
                      >
                        Workflow
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!form.watch("requiresWorkflow") ? "default" : "outline"}
                        onClick={() => form.setValue("requiresWorkflow", false)}
                        className={!form.watch("requiresWorkflow") ? "bg-red-600" : ""}
                      >
                        No Workflow
                      </Button>
                    </div>
                  </div>

                  {/* Only show balance deduction options when workflow is enabled */}
                  {form.watch("requiresWorkflow") && (
                    <div className="flex items-center justify-between">
                      <span>Leave balance is deducted</span>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={form.watch("leaveBalanceDeduction") === "before_workflow" ? "default" : "outline"}
                          onClick={() => form.setValue("leaveBalanceDeduction", "before_workflow")}
                          className={form.watch("leaveBalanceDeduction") === "before_workflow" ? "bg-green-600" : ""}
                        >
                          Before the workflow
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={form.watch("leaveBalanceDeduction") === "after_workflow" ? "default" : "outline"}
                          onClick={() => form.setValue("leaveBalanceDeduction", "after_workflow")}
                          className={form.watch("leaveBalanceDeduction") === "after_workflow" ? "bg-green-600" : ""}
                        >
                          After the workflow
                        </Button>
                      </div>
                    </div>
                  )}



                  <FormField
                    control={form.control}
                    name="allowWithdrawalBeforeApproval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Withdrawal of application is allowed *</FormLabel>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked) {
                                  // Uncheck Not Allowed when Before approval is selected
                                  form.setValue("allowWithdrawalNotAllowed", false);
                                }
                              }}
                            />
                            <span>Before approval</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={form.watch("allowWithdrawalAfterApproval")}
                              onCheckedChange={(checked) => {
                                form.setValue("allowWithdrawalAfterApproval", !!checked);
                                if (checked) {
                                  // Uncheck Not Allowed when After approval is selected
                                  form.setValue("allowWithdrawalNotAllowed", false);
                                }
                              }}
                            />
                            <span>After approval</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={form.watch("allowWithdrawalNotAllowed")}
                              onCheckedChange={(checked) => {
                                form.setValue("allowWithdrawalNotAllowed", !!checked);
                                if (checked) {
                                  // Uncheck Before and After when Not allowed is selected
                                  form.setValue("allowWithdrawalBeforeApproval", false);
                                  form.setValue("allowWithdrawalAfterApproval", false);
                                }
                              }}
                            />
                            <span>Not allowed</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="negativeLeaveBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negative leave balance</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-gray-500">(days) if the value is 0, it is understood that negative leave balance is not allowed.</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carryForwardLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carry forward</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              min="0"
                              {...field}
                              onChange={e => {
                                const value = Number(e.target.value);
                                field.onChange(value >= 0 ? value : 0);
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-500">(days) to the</span>
                            <Select value={form.watch("carryForwardPeriod")} onValueChange={(value) => form.setValue("carryForwardPeriod", value as any)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="month">Next Month</SelectItem>
                                <SelectItem value="quarter">Next Quarter</SelectItem>
                                <SelectItem value="year">Next Year</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-gray-500">if the value is 0, it is understood that carry forward is not allowed.</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>



              {/* En-cashment */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>En-cashment</CardTitle>
                    <Switch
                      checked={form.watch("encashment")}
                      onCheckedChange={(checked) => form.setValue("encashment", checked)}
                    />
                  </div>
                </CardHeader>
                {form.watch("encashment") && (
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="encashmentCalculation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calculate en-cashment using *</FormLabel>
                          <div className="flex space-x-4">
                            <Button
                              type="button"
                              variant={field.value === "basic_da" ? "default" : "outline"}
                              onClick={() => field.onChange("basic_da")}
                              className={field.value === "basic_da" ? "bg-green-600" : ""}
                            >
                              Basic / DA
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "ctc" ? "default" : "outline"}
                              onClick={() => field.onChange("ctc")}
                              className={field.value === "ctc" ? "bg-green-600" : ""}
                            >
                              CTC
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "gross_salary" ? "default" : "outline"}
                              onClick={() => field.onChange("gross_salary")}
                              className={field.value === "gross_salary" ? "bg-green-600" : ""}
                            >
                              Gross Salary
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxEncashmentDays"
                      render={({ field }) => {
                        const isNoLimit = field.value === -1;
                        
                        return (
                          <FormItem>
                            <FormLabel>Max. days that can be en-cashed *</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="encash-limit"
                                      name="encashmentType"
                                      checked={!isNoLimit}
                                      onChange={() => field.onChange(0)}
                                    />
                                    <label htmlFor="encash-limit" className="text-sm">Set Limit</label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="encash-no-limit"
                                      name="encashmentType"
                                      checked={isNoLimit}
                                      onChange={() => field.onChange(-1)}
                                    />
                                    <label htmlFor="encash-no-limit" className="text-sm">No Limit</label>
                                  </div>
                                </div>
                                {!isNoLimit && (
                                  <div className="flex items-center space-x-2">
                                    <Input 
                                      type="number" 
                                      value={field.value === -1 ? 0 : field.value}
                                      onChange={e => {
                                        const value = Number(e.target.value);
                                        field.onChange(value >= 0 ? value : 0);
                                      }}
                                      className="w-32"
                                      placeholder="0"
                                      min="0"
                                    />
                                    <span className="text-gray-500">(days)</span>
                                  </div>
                                )}
                                {isNoLimit && (
                                  <p className="text-sm text-green-600">No limit set - employees can encash any amount</p>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="encashmentTiming"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leaves can be en-cashed at</FormLabel>
                          <div className="flex space-x-4">
                            <Button
                              type="button"
                              variant={field.value === "exit_retirement" ? "default" : "outline"}
                              onClick={() => field.onChange("exit_retirement")}
                              className={field.value === "exit_retirement" ? "bg-green-600" : ""}
                            >
                              Exit/Retirement
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "annually" ? "default" : "outline"}
                              onClick={() => field.onChange("annually")}
                              className={field.value === "annually" ? "bg-green-600" : ""}
                            >
                              Annually
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                )}
              </Card>

              {/* Other Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Other Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span>Allow applications on behalf of others</span>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={form.watch("allowApplicationsOnBehalf") ? "default" : "outline"}
                        onClick={() => form.setValue("allowApplicationsOnBehalf", true)}
                        className={form.watch("allowApplicationsOnBehalf") ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      >
                        Allowed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!form.watch("allowApplicationsOnBehalf") ? "default" : "outline"}
                        onClick={() => form.setValue("allowApplicationsOnBehalf", false)}
                        className={!form.watch("allowApplicationsOnBehalf") ? "bg-gray-600 hover:bg-gray-700 text-white" : ""}
                      >
                        Not Allowed
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-sm font-medium">Leave data to be shown in Payslips</span>
                    <div className="flex space-x-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch("showAvailedLeaves")}
                          onCheckedChange={(checked) => form.setValue("showAvailedLeaves", !!checked)}
                        />
                        <span>Availed leaves</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch("showBalanceLeaves")}
                          onCheckedChange={(checked) => form.setValue("showBalanceLeaves", !!checked)}
                        />
                        <span>Balance leaves</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Maximum balance</span>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        value={form.watch("maximumBalance")}
                        onChange={e => form.setValue("maximumBalance", Number(e.target.value))}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                      <span className="text-gray-500 text-sm">(days) if the value is 0, it is understood that there is no limit.</span>
                    </div>
                  </div>
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

            </form>
          </Form>
        </div>

        <div className="flex justify-between p-8 mt-4 border-t bg-gray-50 sticky bottom-0">
          <div className="flex space-x-4">
            <Button variant="outline" onClick={onClose} type="button" className="px-6 py-3 min-h-[44px]">
              Discard
            </Button>
            {variant?.id && (
              <Button 
                variant="destructive" 
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                type="button"
                className="px-6 py-3 min-h-[44px]"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Variant"}
              </Button>
            )}
          </div>


          <div className="flex space-x-2">
            <Button 
              type="button"
              disabled={mutation.isPending}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 min-h-[44px]"
              onClick={() => {
                const currentValues = form.getValues();
                onSubmit(currentValues);
              }}
            >
              {mutation.isPending ? (variant?.id ? "Updating..." : "Creating...") : (variant?.id ? "Update Leave Variant" : "Create Leave Variant")}
            </Button>
          </div>
        </div>
      </div>

      {/* Employee Assignment Modal */}
      {showEmployeeAssignment && (
        <EmployeeAssignment
          onClose={() => setShowEmployeeAssignment(false)}
          preSelectedEmployees={assignedEmployees}
          applicableGenders={form.watch("applicableGenders")}
          onAssign={async (selectedEmployees) => {
            try {
              // For new variants, store employees in global variable for persistence
              if (!variant?.id) {
                pendingEmployeeAssignments = [...selectedEmployees];
                setAssignedEmployees(selectedEmployees);
                assignedEmployeesRef.current = [...selectedEmployees];
                setShowEmployeeAssignment(false);
                toast({
                  title: "Success",
                  description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} will be assigned when variant is created.`,
                });
                return;
              }

              // For existing variants, save assignments immediately
              const assignments = selectedEmployees.map(emp => ({
                userId: emp.user_id,
                leaveVariantId: variant.id,
                assignmentType: "leave_variant"
              }));
              
              await apiRequest("POST", "/api/employee-assignments/bulk", { assignments });

              // Update local state with selected employees
              setAssignedEmployees(selectedEmployees);
              
              // Invalidate the query to refresh data
              queryClient.invalidateQueries({ 
                queryKey: [`/api/employee-assignments/${variant.id}`] 
              });
              
              toast({
                title: "Success",
                description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} assigned successfully.`,
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to save employee assignments.",
                variant: "destructive",
              });
            }
          }}
        />
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Upload, Edit, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";
import { useWorkPattern } from "@/hooks/useWorkPattern";
import { CollaborativeLeaveForm } from "@/components/CollaborativeLeaveForm";
import TaskManager from "@/pages/TaskManager";

export default function LeaveApplications() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedPeriod, setSelectedPeriod] = useState("Yearly");
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<
    number | null
  >(null);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [applyOnBehalf, setApplyOnBehalf] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [collaborativeLeave, setCollaborativeLeave] = useState(false);
  const [collaborativeTasks, setCollaborativeTasks] = useState<any[]>([]);
  const { toast } = useToast();
  const permissions = usePermissions();
  const { employees: externalEmployees } = useExternalEmployeeData();
  const {
    workPattern,
    holidays: workPatternHolidays,
    isLoading: workPatternLoading,
    isWorkingDay,
    isHoliday,
    getHolidayDetails,
    calculateWorkingDays,
  } = useWorkPattern();

  // Get current user ID from localStorage - user_id should match the logged in user
  const currentUserId = localStorage.getItem("user_id") || "14674";

  // Get org_id from localStorage
  const currentOrgId = localStorage.getItem("org_id") || "18";

  // Mutation for "After Earning" recalculation
  const recalculateAfterEarningMutation = useMutation({
    mutationFn: async () => {
      console.log(
        "[AfterEarning - LeaveApp] Triggering balance recalculation for After Earning leave types",
      );
      const response = await fetch("/api/recalculate-leave-balances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-Id": currentOrgId,
        },
      });
      if (!response.ok) throw new Error("Recalculation failed");
      return response.json();
    },
    onSuccess: () => {
      console.log(
        "[AfterEarning - LeaveApp] Balance recalculation completed successfully",
      );
      // Refresh leave balance data for current user
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances`],
      });
    },
    onError: (error) => {
      console.error(
        "[AfterEarning - LeaveApp] Balance recalculation failed:",
        error,
      );
    },
  });

  // Debug external employee data
  useEffect(() => {
    console.log("=== EXTERNAL EMPLOYEE DATA DEBUG ===");
    console.log("External employees loaded:", externalEmployees?.length || 0);
    console.log("Current user ID:", currentUserId);
    if (externalEmployees?.length > 0) {
      const currentEmployee = externalEmployees.find(
        (emp: any) =>
          emp.user_id?.toString() === currentUserId ||
          (emp as any).id?.toString() === currentUserId ||
          emp.employee_number?.toString() === currentUserId,
      );
      console.log("Found current employee:", currentEmployee);
      console.log(
        "Employee joining date:",
        (currentEmployee as any)?.date_of_joining,
      );
    }
    console.log("===================================");
  }, [externalEmployees, currentUserId]);

  // Debug permissions to see what we're getting
  useEffect(() => {
    console.log("=== LEAVE PERMISSION DEBUG ===");
    console.log(
      "Current role from localStorage:",
      localStorage.getItem("role"),
    );
    console.log(
      "Current org_id from localStorage:",
      localStorage.getItem("org_id"),
    );
    console.log("Full permissions hook result:", permissions);
    console.log("permissions.permissions:", permissions?.permissions);
    console.log(
      "allowOnBehalf from permissions.permissions:",
      (permissions?.permissions as any)?.allowOnBehalf,
    );
    console.log(
      "allowOnBehalf.leave:",
      (permissions?.permissions as any)?.allowOnBehalf?.leave,
    );
    console.log(
      "Should show checkbox?",
      (permissions?.permissions as any)?.allowOnBehalf?.leave,
    );
    console.log("================================");
  }, [permissions]);

  // Check for "Apply on Behalf" URL parameter and stored employee data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onBehalfParam = urlParams.get("onBehalf");

    if (onBehalfParam === "true") {
      const storedEmployee = localStorage.getItem("applyOnBehalfEmployee");
      if (storedEmployee) {
        try {
          const employee = JSON.parse(storedEmployee);
          setApplyOnBehalf(true);
          setSelectedEmployeeId(employee.id);
          setIsCreateDialogOpen(true);

          // Clear the stored employee data and URL parameter
          localStorage.removeItem("applyOnBehalfEmployee");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } catch (error) {
          console.error("Error parsing stored employee data:", error);
        }
      }
    }
  }, []);

  // Reset on-behalf state when dialog opens/closes
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setApplyOnBehalf(false);
      setSelectedEmployeeId("");
      setFormData({
        startDate: "",
        endDate: "",
        reason: "",
        description: "",
        halfDay: false,
        quarterDay: false,
        documents: [] as File[],
      });
      setHalfDaySelections({
        startHalfDay: false,
        endHalfDay: false,
      });
      setSelectedLeaveType(null);
      setValidationErrors([]);
    }
  }, [isCreateDialogOpen]);

  // Force permissions cache invalidation when component mounts
  useEffect(() => {
    // Dispatch custom event to invalidate permissions cache
    window.dispatchEvent(new CustomEvent("permissions-updated"));
  }, []);

  // No cache invalidation needed - queries are configured to always fetch fresh data

  const { data: leaveRequests = [] } = useQuery({
    queryKey: [`/api/leave-requests?userId=${currentUserId}`],
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
    staleTime: 0, // Force fresh fetch every time
    refetchOnMount: true, // Ensure fresh data on component mount
  });

  // Fetch all employee assignments to determine which leave types this user can access
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  // Fetch all leave variants to map assignments to leave types
  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  // Check for "After Earning" leave types and trigger recalculation when Leave Applications screen loads
  useEffect(() => {
    if (
      leaveVariants &&
      leaveVariants.length > 0 &&
      !recalculateAfterEarningMutation.isPending
    ) {
      const afterEarningVariants = leaveVariants.filter(
        (v: any) => v.grantLeaves === "after_earning",
      );

      if (afterEarningVariants.length > 0) {
        const hasRecalculatedKey = `after_earning_recalc_${currentOrgId}_${new Date().toDateString()}`;
        const hasRecalculated = sessionStorage.getItem(hasRecalculatedKey);

        if (!hasRecalculated) {
          console.log(
            "[AfterEarning - LeaveApp] Found After Earning leave types, triggering balance recalculation:",
            afterEarningVariants.map((v: any) => ({
              id: v.id,
              name: v.leaveVariantName,
            })),
          );

          sessionStorage.setItem(hasRecalculatedKey, "true");
          recalculateAfterEarningMutation.mutate();
        } else {
          console.log(
            "[AfterEarning - LeaveApp] Already recalculated today, skipping",
          );
        }
      }
    }
  }, [leaveVariants, currentOrgId, recalculateAfterEarningMutation.isPending]);

  // Fetch employee leave balances for current user
  const { data: leaveBalances = [], refetch: refetchBalances } = useQuery({
    queryKey: [`/api/employee-leave-balances/${currentUserId}`],
    enabled: !!currentUserId,
    staleTime: 0, // Force fresh fetch every time
    refetchOnMount: true, // Ensure fresh data on component mount
  });

  // Fetch leave balance transactions for the table
  const { data: leaveTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
    enabled: !!currentUserId,
  });

  // Fetch blackout periods for validation
  const { data: blackoutPeriods = [] } = useQuery({
    queryKey: ["/api/blackout-periods"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Check if collaborative leave feature is enabled
  const { data: collaborativeSettings } = useQuery({
    queryKey: ["/api/collaborative-leave-settings"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Remove debug statements that access availableLeaveVariants before it's declared

  // User ID is now properly managed by JWT processing and manual localStorage settings

  // Holidays now come from the useWorkPattern hook

  // Form state for validation
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicableAfterError, setApplicableAfterError] = useState<string>("");
  const [isLeaveTypeEligible, setIsLeaveTypeEligible] = useState(true);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    description: "",
    halfDay: false,
    quarterDay: false,
    documents: [] as File[],
  });
  const [halfDaySelections, setHalfDaySelections] = useState({
    startHalfDay: false,
    endHalfDay: false,
  });

  // Function to check if user is assigned to a blackout period that conflicts with leave dates
  const checkBlackoutPeriodConflict = (
    userId: string,
    startDate: Date,
    endDate: Date,
  ): string | null => {
    if (!blackoutPeriods || blackoutPeriods.length === 0) {
      return null; // No blackout periods configured
    }

    console.log("🚫 [Blackout Period Validation] Checking for conflicts:", {
      userId: userId,
      userIdString: userId.toString(),
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      blackoutPeriods: blackoutPeriods.length,
    });

    for (const period of blackoutPeriods) {
      // Check if user is assigned to this blackout period (check both string and number formats)
      const isUserAssigned =
        period.assignedEmployees &&
        (period.assignedEmployees.includes(userId.toString()) ||
          period.assignedEmployees.includes(parseInt(userId)));

      if (!isUserAssigned) {
        continue; // User not assigned to this blackout period
      }

      // Check if leave dates overlap with blackout period
      const blackoutStart = new Date(period.startDate);
      const blackoutEnd = new Date(period.endDate);

      // Check for date overlap: (startA <= endB) && (startB <= endA)
      const hasOverlap = startDate <= blackoutEnd && blackoutStart <= endDate;

      console.log("🚫 [Blackout Period Validation] Checking period:", {
        periodId: period.id,
        periodTitle: period.title,
        periodDates: `${blackoutStart.toISOString().split("T")[0]} to ${blackoutEnd.toISOString().split("T")[0]}`,
        isUserAssigned,
        hasOverlap,
        allowLeaves: period.allowLeaves,
        assignedEmployees: period.assignedEmployees,
      });

      if (hasOverlap) {
        // Check if leave applications are allowed during this blackout period (use allowLeaves field)
        if (!period.allowLeaves) {
          const periodStartStr = blackoutStart.toLocaleDateString();
          const periodEndStr = blackoutEnd.toLocaleDateString();

          if (periodStartStr === periodEndStr) {
            return `You are not allowed to apply for leave during the blackout period "${period.title}" on ${periodStartStr}.`;
          } else {
            return `You are not allowed to apply for leave during the blackout period "${period.title}" from ${periodStartStr} to ${periodEndStr}.`;
          }
        } else {
          // If allowLeaves is true, show informational message but don't block submission
          console.log(
            "🚫 [Blackout Period Info] Leave overlaps with blackout period but applications are allowed:",
            {
              periodTitle: period.title,
              allowLeaves: period.allowLeaves,
            },
          );
        }
      }
    }

    return null; // No conflicts found
  };

  // Function to calculate total working days based on current form state
  const calculateTotalWorkingDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    // Calculate working days using the same logic as form submission
    let workingDays = calculateWorkingDays(startDate, endDate);

    // Apply half day adjustments
    if (startDate.getTime() === endDate.getTime()) {
      // Same day - either full day or half day
      if (halfDaySelections.startHalfDay || halfDaySelections.endHalfDay) {
        workingDays = 0.5;
      }
    } else {
      // Multiple days - adjust for half days
      if (halfDaySelections.startHalfDay) {
        workingDays -= 0.5;
      }
      if (halfDaySelections.endHalfDay) {
        workingDays -= 0.5;
      }
    }

    return workingDays;
  };

  // Work pattern data now comes from useWorkPattern hook

  // calculateWorkingDays function now comes from useWorkPattern hook

  // Function to format date for input min/max attributes
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Get min and max dates from work pattern
  const minDate = workPattern
    ? formatDateForInput(new Date(workPattern.startDate))
    : formatDateForInput(new Date("2025-01-01"));
  const maxDate = workPattern
    ? formatDateForInput(new Date(workPattern.endDate))
    : formatDateForInput(new Date("2025-12-31"));

  // Filter leave variants based on user's assignments - ensure arrays are safe
  const assignmentsArray = Array.isArray(allAssignments) ? allAssignments : [];
  const variantsArray = Array.isArray(leaveVariants) ? leaveVariants : [];

  // Filter user assignments and available leave variants
  const userAssignments = assignmentsArray.filter(
    (assignment: any) =>
      assignment.userId === currentUserId &&
      assignment.assignmentType === "leave_variant",
  );

  const assignedVariantIds = userAssignments.map(
    (assignment: any) => assignment.leaveVariantId,
  );

  const availableLeaveVariants = variantsArray.filter((variant: any) =>
    assignedVariantIds.includes(variant.id),
  );

  // Only show essential debugging for leave type filtering
  console.log("🔍 LEAVE TYPE DEBUG:", {
    userId: currentUserId,
    totalAssignments: assignmentsArray.length,
    userAssignments: userAssignments.length,
    assignedVariantIds,
    availableVariants: availableLeaveVariants.length,
    variantNames: availableLeaveVariants.map((v: any) => v.leaveVariantName),
  });

  // Find current user in external employee data
  const currentUserEmployee = externalEmployees?.find(
    (emp: any) =>
      emp.user_id?.toString() === currentUserId ||
      emp.id?.toString() === currentUserId ||
      emp.employee_number?.toString() === currentUserId,
  );

  // Real-time validation for "Applicable after" when leave type is selected
  useEffect(() => {
    console.log("🔍 [Applicable After Debug] Effect triggered:", {
      selectedLeaveType:
        selectedLeaveType?.leaveVariantName || selectedLeaveType?.leaveTypeName,
      applicableAfterType: selectedLeaveType?.applicableAfterType,
      applicableAfter: selectedLeaveType?.applicableAfter,
      currentUserId,
      externalEmployeesCount: externalEmployees?.length || 0,
    });

    if (!selectedLeaveType) {
      setApplicableAfterError("");
      setIsLeaveTypeEligible(true);
      return;
    }

    // Check "Applicable after" eligibility immediately when leave type is selected
    if (
      selectedLeaveType.applicableAfterType &&
      selectedLeaveType.applicableAfterType !== "date_of_joining"
    ) {
      console.log(
        "🔍 [Applicable After Debug] Checking eligibility for:",
        selectedLeaveType.applicableAfterType,
      );

      // Find current employee's joining date from external API data
      const currentEmployee = externalEmployees?.find((emp: any) => {
        const matches =
          emp.user_id?.toString() === currentUserId ||
          emp.id?.toString() === currentUserId ||
          emp.employee_number?.toString() === currentUserId;
        if (matches) {
          console.log("🔍 [Employee Match] Found matching employee:", {
            emp_user_id: emp.user_id,
            emp_id: emp.id,
            emp_employee_number: emp.employee_number,
            currentUserId,
            matched_on:
              emp.user_id?.toString() === currentUserId
                ? "user_id"
                : emp.id?.toString() === currentUserId
                  ? "id"
                  : "employee_number",
          });
        }
        return matches;
      });

      console.log("🔍 [Applicable After Debug] Found employee:", {
        currentEmployee: currentEmployee
          ? {
              user_id: currentEmployee.user_id,
              id: currentEmployee.id,
              employee_number: currentEmployee.employee_number,
              date_of_joining: currentEmployee.date_of_joining,
              name: currentEmployee.user_name || currentEmployee.name,
            }
          : "NOT FOUND",
      });

      if (currentEmployee && currentEmployee.date_of_joining) {
        const joiningDate = new Date(currentEmployee.date_of_joining);
        const today = new Date();

        console.log("🔍 [Applicable After Debug] Date comparison:", {
          joiningDate: joiningDate.toLocaleDateString(),
          today: today.toLocaleDateString(),
          applicableAfter: selectedLeaveType.applicableAfter,
        });

        if (
          selectedLeaveType.applicableAfterType === "days" &&
          selectedLeaveType.applicableAfter > 0
        ) {
          // Calculate eligible date = joining date + specified days
          const eligibleDate = new Date(joiningDate);
          eligibleDate.setDate(
            eligibleDate.getDate() + selectedLeaveType.applicableAfter,
          );

          console.log("🔍 [Applicable After Debug] Eligibility check:", {
            eligibleDate: eligibleDate.toLocaleDateString(),
            todayLessThanEligible: today < eligibleDate,
          });

          if (today < eligibleDate) {
            const remainingDays = Math.ceil(
              (eligibleDate.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const errorMessage = `You can apply for ${selectedLeaveType.leaveVariantName || selectedLeaveType.leaveTypeName} only after ${selectedLeaveType.applicableAfter} days from your joining date (${joiningDate.toLocaleDateString()}). Eligible from ${eligibleDate.toLocaleDateString()} (${remainingDays} days remaining)`;
            console.log(
              "🚫 [Applicable After Debug] Setting error:",
              errorMessage,
            );
            setApplicableAfterError(errorMessage);
            setIsLeaveTypeEligible(false);
            return;
          }
        }
      } else {
        console.log(
          "🔍 [Applicable After Debug] No employee or joining date found",
        );
      }
    } else {
      console.log(
        "🔍 [Applicable After Debug] No applicable after type or is date_of_joining",
      );
    }

    // If we reach here, the leave type is eligible
    console.log("✅ [Applicable After Debug] Leave type is eligible");
    setApplicableAfterError("");
    setIsLeaveTypeEligible(true);
  }, [selectedLeaveType, externalEmployees, currentUserId]);

  // Debug data loading state for summary cards (after availableLeaveVariants is declared)
  console.log(`🧮 [Summary Cards Debug] Data loading state:`, {
    leaveTransactionsLoaded: leaveTransactions.length > 0,
    leaveBalancesLoaded: leaveBalances.length > 0,
    availableVariantsCount: availableLeaveVariants?.length || 0,
    sampleTransaction: leaveTransactions[0] || "No transactions",
    sampleBalance: leaveBalances[0] || "No balances",
  });

  // CRITICAL DEBUG: Track when calculation data changes
  useEffect(() => {
    console.log(
      `🔄 [Data Change] LeaveApplications calculation dependencies changed:`,
      {
        timestamp: new Date().toLocaleTimeString(),
        transactionCount: leaveTransactions.length,
        balanceCount: leaveBalances.length,
        variantCount: availableLeaveVariants?.length || 0,
        userId: currentUserId,
      },
    );
  }, [leaveTransactions, leaveBalances, availableLeaveVariants, currentUserId]);

  // Process arrays safely for validation and UI
  const holidaysArray = Array.isArray(workPatternHolidays)
    ? workPatternHolidays
    : [];
  const balancesArray = Array.isArray(leaveBalances)
    ? (leaveBalances as any[])
    : [];

  // Validation functions
  const validateLeaveApplication = (
    variant: any,
    startDate: Date,
    endDate: Date,
    requestedDays: number,
  ) => {
    const errors: string[] = [];

    // Calculate working days correctly
    const actualWorkingDays = calculateWorkingDays(startDate, endDate);

    // Debug logging
    console.log("Validation Debug:", {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      actualWorkingDays,
      variantMaxDays: variant.maxDaysInStretch,
      variantName: variant.leaveVariantName,
    });

    // Check available balance (stored as full days)
    const balance = balancesArray.find(
      (b: any) => b.leaveVariantId === variant.id,
    );
    const availableDays = balance ? parseFloat(balance.currentBalance) : 0;

    // Find the leave type to check negative balance setting
    const leaveType = Array.isArray(leaveTypes)
      ? leaveTypes.find((lt: any) => lt.id === variant.leaveTypeId)
      : null;
    const allowNegativeBalance = leaveType?.negativeLeaveBalance ?? 0; // Use nullish coalescing to handle null values

    // Enhanced balance validation based on negative balance setting
    if (allowNegativeBalance === 0) {
      // Negative balance NOT allowed - strict validation
      if (actualWorkingDays > availableDays) {
        errors.push(
          `Insufficient balance. Available: ${availableDays} days, Requested: ${actualWorkingDays} days. Negative balance is not allowed for this leave type.`,
        );
      }
    } else {
      // Negative balance allowed up to specified limit - check against limit
      const wouldResultInBalance = availableDays - actualWorkingDays;
      const negativeLimit = -Math.abs(allowNegativeBalance); // Convert to negative number

      if (wouldResultInBalance < negativeLimit) {
        errors.push(
          `Insufficient balance. Available: ${availableDays} days, Requested: ${actualWorkingDays} days. Maximum negative balance allowed: ${Math.abs(allowNegativeBalance)} days.`,
        );
      }
    }

    // Debug negative balance validation - enhanced logging
    if (
      variant.leaveVariantName?.includes("Casual") ||
      variant.leaveVariantName?.includes("Sick")
    ) {
      console.log("🚫 [Negative Balance Validation]:", {
        variantName: variant.leaveVariantName,
        leaveTypeId: variant.leaveTypeId,
        leaveType: leaveType?.name,
        leaveTypeRaw: leaveType,
        allowNegativeBalance,
        availableDays,
        requestedDays: actualWorkingDays,
        wouldResultInBalance: availableDays - actualWorkingDays,
        negativeLimit:
          allowNegativeBalance > 0 ? -Math.abs(allowNegativeBalance) : "N/A",
        isNegativeAllowed: allowNegativeBalance > 0,
        validationCheck:
          allowNegativeBalance === 0 ? "STRICT_MODE" : "NEGATIVE_ALLOWED",
        willPassValidation:
          allowNegativeBalance === 0
            ? actualWorkingDays <= availableDays
            : availableDays - actualWorkingDays >=
              -Math.abs(allowNegativeBalance),
        allLeaveTypes: Array.isArray(leaveTypes)
          ? leaveTypes.map((lt) => ({
              id: lt.id,
              name: lt.name,
              negativeBalance: lt.negativeLeaveBalance,
            }))
          : "Not array",
      });
    }

    // Check minimum days required
    if (
      variant.minDaysRequired > 0 &&
      actualWorkingDays < variant.minDaysRequired
    ) {
      errors.push(
        `Minimum ${variant.minDaysRequired} days required for this leave type`,
      );
    }

    // Check maximum days in stretch
    if (
      variant.maxDaysInStretch > 0 &&
      actualWorkingDays > variant.maxDaysInStretch
    ) {
      console.log("Max days validation failed:", {
        actualWorkingDays,
        maxDaysInStretch: variant.maxDaysInStretch,
        comparison: `${actualWorkingDays} > ${variant.maxDaysInStretch}`,
      });
      errors.push(
        `Maximum ${variant.maxDaysInStretch} days allowed in a single application`,
      );
    }

    // Check holiday validation using external API data format
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      const isHoliday = holidaysArray.some((holiday: any) => {
        if (!holiday.selectedDate) return false;
        const holidayDate = new Date(holiday.selectedDate)
          .toISOString()
          .split("T")[0];
        return holidayDate === dateString;
      });

      if (isHoliday) {
        const holiday = holidaysArray.find((h: any) => {
          if (!h.selectedDate) return false;
          const holidayDate = new Date(h.selectedDate)
            .toISOString()
            .split("T")[0];
          return holidayDate === dateString;
        });
        errors.push(
          `Cannot apply leave on holiday: ${holiday?.holidayName || "Holiday"} (${dateString})`,
        );
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check advance planning requirement
    if (variant.mustBePlannedInAdvance > 0) {
      const today = new Date();
      const daysDifference = Math.ceil(
        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDifference < variant.mustBePlannedInAdvance) {
        errors.push(
          `Leave must be planned ${variant.mustBePlannedInAdvance} days in advance`,
        );
      }
    }

    // Check "Applicable after" eligibility based on leave type configuration
    if (
      variant.applicableAfterType &&
      variant.applicableAfterType !== "date_of_joining"
    ) {
      // Find current employee's joining date from external API data
      const currentEmployee = externalEmployees?.find(
        (emp: any) =>
          emp.user_id?.toString() === currentUserId ||
          emp.id?.toString() === currentUserId ||
          emp.employee_number?.toString() === currentUserId,
      );

      if (currentEmployee && currentEmployee.date_of_joining) {
        const joiningDate = new Date(currentEmployee.date_of_joining);
        const today = new Date();

        if (
          variant.applicableAfterType === "specified_days" &&
          variant.applicableAfterDays > 0
        ) {
          // Calculate eligible date = joining date + specified days
          const eligibleDate = new Date(joiningDate);
          eligibleDate.setDate(
            eligibleDate.getDate() + variant.applicableAfterDays,
          );

          if (today < eligibleDate) {
            const remainingDays = Math.ceil(
              (eligibleDate.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            errors.push(
              `You can apply for ${variant.leaveVariantName || variant.leaveTypeName} only after ${variant.applicableAfterDays} days from your joining date (${joiningDate.toLocaleDateString()}). Eligible from ${eligibleDate.toLocaleDateString()} (${remainingDays} days remaining)`,
            );
          }
        } else if (variant.applicableAfterType === "probation_period_ends") {
          // For probation period validation, you would need probation period data
          // This would typically come from employee configuration or HR settings
          // For now, we'll add a placeholder that can be extended
          console.log(
            "Probation period validation would be implemented here with employee probation data",
          );
        }
      } else {
        // No joining date available - cannot validate eligibility
        console.warn(
          `Cannot validate "Applicable after" for user ${currentUserId} - no joining date available`,
        );
      }
    }

    // Check weekend/holiday restrictions
    if (!variant.allowLeavesBeforeWeekend) {
      const dayBeforeEnd = new Date(endDate);
      dayBeforeEnd.setDate(dayBeforeEnd.getDate() + 1);
      if (dayBeforeEnd.getDay() === 6 || dayBeforeEnd.getDay() === 0) {
        // Saturday or Sunday
        errors.push("Leave cannot be taken before weekends");
      }
    }

    // Check supporting documents requirement
    if (variant.supportingDocuments && formData.documents.length === 0) {
      errors.push("Supporting documents are required for this leave type");
    }

    // Check maximum instances per period (simplified - checking current year)
    const currentYearRequests = sortedRequestsArray.filter((req: any) => {
      const reqYear = new Date(req.startDate).getFullYear();
      return (
        reqYear === parseInt(selectedYear) &&
        req.leaveTypeId === variant.leaveTypeId
      );
    });

    if (
      variant.maxInstances > 0 &&
      currentYearRequests.length >= variant.maxInstances
    ) {
      errors.push(
        `Maximum ${variant.maxInstances} applications allowed per ${variant.maxInstancesPeriod}`,
      );
    }

    // Check for date conflicts with existing approved or pending leave requests
    const targetUserId =
      applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : currentUserId;
    const existingRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

    console.log(
      "🔍 [Date Conflict Debug] Checking conflicts for user:",
      targetUserId,
    );
    console.log(
      "🔍 [Date Conflict Debug] Existing requests:",
      existingRequests.length,
    );
    console.log(
      "🔍 [Date Conflict Debug] Date range:",
      startDate.toISOString().split("T")[0],
      "to",
      endDate.toISOString().split("T")[0],
    );

    const conflictingRequests = existingRequests.filter((request: any) => {
      console.log("🔍 [Date Conflict Debug] Checking request:", {
        id: request.id,
        userId: request.userId,
        status: request.status,
        startDate: request.startDate,
        endDate: request.endDate,
        editingId: editingRequest?.id,
      });

      // Skip checking against the current request being edited
      if (editingRequest && request.id === editingRequest.id) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping current editing request",
        );
        return false;
      }

      // Only check approved and pending requests
      if (!["approved", "pending"].includes(request.status)) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping non-pending/approved request:",
          request.status,
        );
        return false;
      }

      // Check if request is for the same user we're applying for
      if (request.userId !== targetUserId) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping different user:",
          request.userId,
          "vs",
          targetUserId,
        );
        return false;
      }

      // Check for date overlap
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);

      console.log("🔍 [Date Conflict Debug] Date comparison:", {
        newStart: startDate.toISOString().split("T")[0],
        newEnd: endDate.toISOString().split("T")[0],
        existingStart: requestStart.toISOString().split("T")[0],
        existingEnd: requestEnd.toISOString().split("T")[0],
      });

      // Check if dates overlap: (start1 <= end2) && (start2 <= end1)
      const hasOverlap = startDate <= requestEnd && requestStart <= endDate;
      console.log("🔍 [Date Conflict Debug] Overlap check result:", hasOverlap);

      return hasOverlap;
    });

    console.log(
      "🔍 [Date Conflict Debug] Conflicting requests found:",
      conflictingRequests.length,
    );

    if (conflictingRequests.length > 0) {
      const conflict = conflictingRequests[0];
      const conflictStart = new Date(conflict.startDate).toLocaleDateString();
      const conflictEnd = new Date(conflict.endDate).toLocaleDateString();
      const statusText =
        conflict.status === "approved" ? "approved" : "pending approval";

      console.log("🔍 [Date Conflict Debug] Adding conflict error:", {
        conflictStart,
        conflictEnd,
        statusText,
      });

      if (conflictStart === conflictEnd) {
        errors.push(
          `You already have a ${statusText} leave request on ${conflictStart}`,
        );
      } else {
        errors.push(
          `You already have a ${statusText} leave request from ${conflictStart} to ${conflictEnd}`,
        );
      }
    }

    return errors;
  };

  // Handle leave type selection
  const handleLeaveTypeChange = (variantId: string) => {
    console.log("🎯 [Leave Type Change] Function called with:", {
      variantId,
      variantIdType: typeof variantId,
      availableVariantsCount: availableLeaveVariants.length,
      availableVariants: availableLeaveVariants.map((v) => ({
        id: v.id,
        idType: typeof v.id,
        idString: v.id.toString(),
        name: v.leaveVariantName,
      })),
    });

    const variant = availableLeaveVariants.find(
      (v) => v.id.toString() === variantId,
    );
    console.log("🎯 [Leave Type Change] Selected variant:", {
      variantId,
      variant: variant
        ? {
            id: variant.id,
            leaveVariantName: variant.leaveVariantName,
            leaveTypeName: variant.leaveTypeName,
            applicableAfterType: variant.applicableAfterType,
            applicableAfterDays: variant.applicableAfterDays,
          }
        : "NOT FOUND",
    });

    setSelectedLeaveType(variant);
    setValidationErrors([]);

    // Trigger validation immediately if dates are already selected
    if (formData.startDate && formData.endDate) {
      console.log(
        "🎯 [Leave Type Change] Dates already selected, triggering validation with new leave type",
      );
      setTimeout(() => {
        validateDatesWithVariant(formData, variant);
      }, 100);
    }

    console.log(
      "🎯 [Leave Type Change] State updated, selectedLeaveType should be:",
      variant?.leaveVariantName || "undefined",
    );
  };

  // Validate dates with specific form data
  const validateDatesWithData = (currentFormData: any) => {
    console.log("🔥 validateDatesWithData CALLED!", {
      selectedLeaveType: selectedLeaveType?.leaveVariantName,
      startDate: currentFormData.startDate,
      endDate: currentFormData.endDate,
      currentUserId: currentUserId,
    });

    if (!currentFormData.startDate || !currentFormData.endDate) {
      console.log("Early return - missing dates");
      setValidationErrors([]);
      return;
    }

    const startDate = new Date(currentFormData.startDate);
    const endDate = new Date(currentFormData.endDate);

    // Check for invalid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setValidationErrors([]);
      return;
    }

    if (endDate < startDate) {
      setValidationErrors([]);
      return;
    }

    let errors: string[] = [];

    if (selectedLeaveType) {
      let workingDays = calculateWorkingDays(startDate, endDate);
      const leaveTypeErrors = validateLeaveApplication(
        selectedLeaveType,
        startDate,
        endDate,
        workingDays,
      );
      errors.push(...leaveTypeErrors);
    }

    // Date conflict validation
    const targetUserId =
      applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : currentUserId;
    const existingRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

    console.log(
      "🔍 [Date Conflict Debug] Checking conflicts for user:",
      targetUserId,
    );
    console.log(
      "🔍 [Date Conflict Debug] Existing requests:",
      existingRequests.length,
    );
    console.log(
      "🔍 [Date Conflict Debug] Date range:",
      startDate.toISOString().split("T")[0],
      "to",
      endDate.toISOString().split("T")[0],
    );

    const conflictingRequests = existingRequests.filter((request: any) => {
      if (editingRequest && request.id === editingRequest.id) return false;
      if (!["approved", "pending"].includes(request.status)) return false;
      if (request.userId !== targetUserId) return false;

      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      const hasOverlap = startDate <= requestEnd && requestStart <= endDate;

      console.log("🔍 [Date Conflict Debug] Checking request:", {
        id: request.id,
        dates: `${requestStart.toISOString().split("T")[0]} to ${requestEnd.toISOString().split("T")[0]}`,
        hasOverlap,
      });

      return hasOverlap;
    });

    console.log(
      "🔍 [Date Conflict Debug] Conflicting requests found:",
      conflictingRequests.length,
    );

    if (conflictingRequests.length > 0) {
      const conflict = conflictingRequests[0];
      const conflictStart = new Date(conflict.startDate).toLocaleDateString();
      const conflictEnd = new Date(conflict.endDate).toLocaleDateString();
      const statusText =
        conflict.status === "approved" ? "approved" : "pending approval";

      if (conflictStart === conflictEnd) {
        errors.push(
          `You already have a ${statusText} leave request on ${conflictStart}`,
        );
      } else {
        errors.push(
          `You already have a ${statusText} leave request from ${conflictStart} to ${conflictEnd}`,
        );
      }
    }

    // Check for blackout period conflicts in real-time validation
    const blackoutConflict = checkBlackoutPeriodConflict(
      targetUserId,
      startDate,
      endDate,
    );
    if (blackoutConflict) {
      errors.push(blackoutConflict);
    }

    setValidationErrors(errors);
  };

  // Validate dates with a specific variant (for when leave type changes)
  const validateDatesWithVariant = (currentFormData: any, variant: any) => {
    console.log("🔥 validateDatesWithVariant CALLED!", {
      variantName: variant?.leaveVariantName || "none",
      startDate: currentFormData.startDate,
      endDate: currentFormData.endDate,
      currentUserId: currentUserId,
    });

    if (!currentFormData.startDate || !currentFormData.endDate) {
      console.log("Early return - missing dates");
      setValidationErrors([]);
      return;
    }

    const startDate = new Date(currentFormData.startDate);
    const endDate = new Date(currentFormData.endDate);

    // Check for invalid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setValidationErrors([]);
      return;
    }

    if (endDate < startDate) {
      setValidationErrors([]);
      return;
    }

    let errors: string[] = [];

    if (variant) {
      let workingDays = calculateWorkingDays(startDate, endDate);
      const leaveTypeErrors = validateLeaveApplication(
        variant,
        startDate,
        endDate,
        workingDays,
      );
      errors.push(...leaveTypeErrors);
    }

    // Date conflict validation
    const targetUserId =
      applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : currentUserId;
    const existingRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

    console.log(
      "🔍 [Date Conflict Debug] Checking conflicts for user:",
      targetUserId,
    );
    console.log(
      "🔍 [Date Conflict Debug] Existing requests:",
      existingRequests.length,
    );
    console.log(
      "🔍 [Date Conflict Debug] Date range:",
      startDate.toISOString().split("T")[0],
      "to",
      endDate.toISOString().split("T")[0],
    );

    const conflictingRequests = existingRequests.filter((request: any) => {
      if (editingRequest && request.id === editingRequest.id) return false;
      if (!["approved", "pending"].includes(request.status)) return false;
      if (request.userId !== targetUserId) return false;

      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);
      const hasOverlap = startDate <= requestEnd && requestStart <= endDate;

      console.log("🔍 [Date Conflict Debug] Checking request:", {
        id: request.id,
        dates: `${requestStart.toISOString().split("T")[0]} to ${requestEnd.toISOString().split("T")[0]}`,
        hasOverlap,
      });

      return hasOverlap;
    });

    console.log(
      "🔍 [Date Conflict Debug] Conflicting requests found:",
      conflictingRequests.length,
    );

    if (conflictingRequests.length > 0) {
      const conflict = conflictingRequests[0];
      const conflictStart = new Date(conflict.startDate).toLocaleDateString();
      const conflictEnd = new Date(conflict.endDate).toLocaleDateString();
      const statusText =
        conflict.status === "approved" ? "approved" : "pending approval";

      if (conflictStart === conflictEnd) {
        errors.push(
          `You already have a ${statusText} leave request on ${conflictStart}`,
        );
      } else {
        errors.push(
          `You already have a ${statusText} leave request from ${conflictStart} to ${conflictEnd}`,
        );
      }
    }

    // Check for blackout period conflicts in validateDatesWithVariant
    const blackoutConflict = checkBlackoutPeriodConflict(
      targetUserId,
      startDate,
      endDate,
    );
    if (blackoutConflict) {
      errors.push(blackoutConflict);
    }

    setValidationErrors(errors);
  };

  // Validate dates on change (using current form data)
  const validateDates = () => {
    console.log("🔥 validateDates CALLED!", {
      selectedLeaveType: selectedLeaveType?.leaveVariantName,
      startDate: formData.startDate,
      endDate: formData.endDate,
      currentUserId: currentUserId,
    });

    // Only require dates for validation, not leave type (we can check conflicts for any date)
    if (!formData.startDate || !formData.endDate) {
      console.log("Early return - missing dates");
      setValidationErrors([]); // Clear errors if incomplete
      return;
    }

    console.log(
      "🔍 [Date Conflict Debug] Starting validation in validateDates",
    );
    console.log(
      "🔍 [Date Conflict Debug] Current leave requests length:",
      leaveRequests?.length || 0,
    );
    console.log("🔍 [Date Conflict Debug] Current user ID:", currentUserId);
    console.log(
      "🔍 [Date Conflict Debug] Selected leave type:",
      selectedLeaveType?.leaveVariantName || "None selected",
    );

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    // Check for invalid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setValidationErrors([]);
      return;
    }

    // Only validate if end date is after start date
    if (endDate < startDate) {
      setValidationErrors([]);
      return;
    }

    // Start with empty errors array - we'll check conflicts regardless of leave type
    let errors: string[] = [];

    // If we have a selected leave type, run full validation
    if (selectedLeaveType) {
      let workingDays = calculateWorkingDays(startDate, endDate);
      const leaveTypeErrors = validateLeaveApplication(
        selectedLeaveType,
        startDate,
        endDate,
        workingDays,
      );
      errors.push(...leaveTypeErrors);
    }

    // Add date conflict validation directly here
    console.log(
      "🔍 [Date Conflict Debug] Starting validation in validateDates",
    );
    const targetUserId =
      applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : currentUserId;
    const existingRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

    console.log(
      "🔍 [Date Conflict Debug] Checking conflicts for user:",
      targetUserId,
    );
    console.log(
      "🔍 [Date Conflict Debug] Existing requests:",
      existingRequests.length,
    );
    console.log(
      "🔍 [Date Conflict Debug] Date range:",
      startDate.toISOString().split("T")[0],
      "to",
      endDate.toISOString().split("T")[0],
    );

    // Debug: Show all existing request dates for this user
    console.log(
      "🔍 [Date Conflict Debug] All existing requests for user",
      targetUserId,
      ":",
    );
    existingRequests.forEach((req: any, index: number) => {
      if (req.userId === targetUserId) {
        console.log(
          `  Request ${index + 1}: ${req.startDate} to ${req.endDate} (${req.status})`,
        );
      }
    });

    const conflictingRequests = existingRequests.filter((request: any) => {
      console.log("🔍 [Date Conflict Debug] Checking request:", {
        id: request.id,
        userId: request.userId,
        status: request.status,
        startDate: request.startDate,
        endDate: request.endDate,
        editingId: editingRequest?.id,
      });

      // Skip checking against the current request being edited
      if (editingRequest && request.id === editingRequest.id) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping current editing request",
        );
        return false;
      }

      // Only check approved and pending requests
      if (!["approved", "pending"].includes(request.status)) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping non-pending/approved request:",
          request.status,
        );
        return false;
      }

      // Check if request is for the same user we're applying for
      if (request.userId !== targetUserId) {
        console.log(
          "🔍 [Date Conflict Debug] Skipping different user:",
          request.userId,
          "vs",
          targetUserId,
        );
        return false;
      }

      // Check for date overlap
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);

      console.log("🔍 [Date Conflict Debug] Date comparison:", {
        newStart: startDate.toISOString().split("T")[0],
        newEnd: endDate.toISOString().split("T")[0],
        existingStart: requestStart.toISOString().split("T")[0],
        existingEnd: requestEnd.toISOString().split("T")[0],
      });

      // Check if dates overlap: (start1 <= end2) && (start2 <= end1)
      const hasOverlap = startDate <= requestEnd && requestStart <= endDate;
      console.log("🔍 [Date Conflict Debug] Overlap check result:", hasOverlap);

      return hasOverlap;
    });

    console.log(
      "🔍 [Date Conflict Debug] Conflicting requests found:",
      conflictingRequests.length,
    );

    if (conflictingRequests.length > 0) {
      const conflict = conflictingRequests[0];
      const conflictStart = new Date(conflict.startDate).toLocaleDateString();
      const conflictEnd = new Date(conflict.endDate).toLocaleDateString();
      const statusText =
        conflict.status === "approved" ? "approved" : "pending approval";

      console.log("🔍 [Date Conflict Debug] Adding conflict error:", {
        conflictStart,
        conflictEnd,
        statusText,
      });

      if (conflictStart === conflictEnd) {
        errors.push(
          `You already have a ${statusText} leave request on ${conflictStart}`,
        );
      } else {
        errors.push(
          `You already have a ${statusText} leave request from ${conflictStart} to ${conflictEnd}`,
        );
      }
    }

    // Check for blackout period conflicts in main validateDates function
    const blackoutConflict = checkBlackoutPeriodConflict(
      targetUserId,
      startDate,
      endDate,
    );
    if (blackoutConflict) {
      errors.push(blackoutConflict);
    }

    setValidationErrors(errors);
  };

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      // Use selectedEmployeeId if applying on behalf, otherwise use current user
      const targetUserId =
        applyOnBehalf && selectedEmployeeId
          ? selectedEmployeeId
          : currentUserId;
      const requestData = {
        ...data,
        userId: targetUserId,
        collaborativeTasks: collaborativeTasks, // Include collaborative tasks data
      };

      // First create the leave request
      const leaveResponse = await apiRequest(
        "POST",
        "/api/leave-requests",
        requestData,
      );

      // If collaborative leave is enabled and tasks are provided, create tasks
      if (data.collaborativeTasks && data.collaborativeTasks.length > 0) {
        console.log(
          "🚀 Creating collaborative tasks for leave request:",
          leaveResponse.id,
        );
        const formattedTasks = data.collaborativeTasks.map((task: any) => ({
          assigneeUserId: task.assigneeUserId,
          assigneeName: task.assigneeName,
          assigneeEmail: task.assigneeEmail,
          taskDescription: task.taskDescription,
          expectedSupportDateFrom: task.expectedSupportDateFrom,
          expectedSupportDateTo: task.expectedSupportDateTo,
          additionalNotes: task.additionalNotes,
          notificationMethod: "email",
        }));

        await apiRequest(
          "POST",
          `/api/leave-requests/${leaveResponse.id}/tasks`,
          {
            tasks: formattedTasks,
          },
        );
        console.log("🚀 Tasks created successfully");
      }

      return leaveResponse;
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for real-time balance updates
      const targetUserId =
        applyOnBehalf && selectedEmployeeId
          ? selectedEmployeeId
          : currentUserId;

      queryClient.invalidateQueries({
        queryKey: [`/api/leave-requests?userId=${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-requests?userId=${targetUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${targetUserId}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/employee-leave-balances"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/leave-balance-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-balance-transactions/${targetUserId}`],
      });

      // Force immediate data refetch for balance updates
      queryClient.refetchQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      if (targetUserId !== currentUserId) {
        queryClient.refetchQueries({
          queryKey: [`/api/employee-leave-balances/${targetUserId}`],
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedLeaveType(null);
      setValidationErrors([]);
      setIsSubmitting(false);
      // Reset form data to prevent resubmission
      setFormData({
        startDate: "",
        endDate: "",
        reason: "",
        description: "",
        halfDay: false,
        quarterDay: false,
        documents: [] as File[],
      });
      setHalfDaySelections({
        startHalfDay: false,
        endHalfDay: false,
      });
      // Show different success message based on whether tasks were created
      const hasCollaborativeTasks =
        data.collaborativeTasks && data.collaborativeTasks.length > 0;
      toast({
        title: "Success",
        description: hasCollaborativeTasks
          ? "Leave application submitted successfully with task assignments created"
          : "Leave application submitted successfully",
      });
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave application",
        variant: "destructive",
      });
    },
  });

  const deleteLeaveRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/leave-requests/${id}`);
    },
    onSuccess: () => {
      // Invalidate all possible leave request queries
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-requests?userId=${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/employee-leave-balances/${currentUserId}`,
          { year: selectedYear },
        ],
      });
      // Also refetch immediately to ensure UI updates
      queryClient.refetchQueries({
        queryKey: [`/api/leave-requests?userId=${currentUserId}`],
      });
      queryClient.refetchQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      toast({
        title: "Success",
        description: "Leave request cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel leave request",
        variant: "destructive",
      });
    },
  });

  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/leave-requests/${id}`, data);
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for real-time balance updates
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-requests?userId=${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/employee-leave-balances"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/leave-balance-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
      });

      // Force immediate data refetch for balance updates
      queryClient.refetchQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });

      setIsEditDialogOpen(false);
      setEditingRequest(null);
      setSelectedLeaveType(null);
      setValidationErrors([]);
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  const withdrawLeaveRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("POST", `/api/leave-requests/${id}/withdraw`, {
        reason,
      });
    },
    onSuccess: async () => {
      // Invalidate all related queries to ensure balance updates
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-requests?userId=${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/employee-leave-balances/${currentUserId}`,
          { year: selectedYear },
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/${currentUserId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/employee-leave-balances"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-variants"] });

      // Force immediate refetch of balance data to update dropdown
      await refetchBalances();

      // Close dialog and reset form
      setIsWithdrawDialogOpen(false);
      setWithdrawingRequestId(null);
      setWithdrawalReason("");

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handleEditRequest = (request: any) => {
    console.log("[EDIT] Editing request:", request);
    console.log("[EDIT] Available leave types:", leaveTypes);
    console.log("[EDIT] Available leave variants:", leaveVariants);
    console.log(
      "[EDIT] Available leave variants (mapped):",
      availableLeaveVariants,
    );

    // Pre-populate form with existing data
    const leaveVariantsArray = Array.isArray(availableLeaveVariants)
      ? availableLeaveVariants
      : [];

    // Try to find the variant that matches this leave request
    // First try by leaveTypeId, then by any other matching criteria
    let variant = leaveVariantsArray.find(
      (v: any) => v.leaveTypeId === request.leaveTypeId,
    );

    // If the request has a leaveVariantId field, use that instead
    if (!variant && request.leaveVariantId) {
      variant = leaveVariantsArray.find(
        (v: any) => v.id === request.leaveVariantId,
      );
    }

    console.log(
      "[EDIT] Found variant for leaveTypeId",
      request.leaveTypeId,
      ":",
      variant,
    );

    if (variant) {
      setSelectedLeaveType(variant);
      // Add the variant ID to the request for form population
      const enhancedRequest = {
        ...request,
        variantId: variant.id,
      };
      setEditingRequest(enhancedRequest);
    } else {
      console.log("[EDIT] No variant found, using request as-is");
      setEditingRequest(request);
    }

    setIsEditDialogOpen(true);
  };

  const handleCancelRequest = (id: number) => {
    if (confirm("Are you sure you want to cancel this leave request?")) {
      deleteLeaveRequestMutation.mutate(id);
    }
  };

  const handleWithdrawRequest = (id: number) => {
    setWithdrawingRequestId(id);
    setIsWithdrawDialogOpen(true);
  };

  const handleWithdrawSubmit = () => {
    if (withdrawingRequestId && withdrawalReason.trim()) {
      withdrawLeaveRequestMutation.mutate({
        id: withdrawingRequestId,
        reason: withdrawalReason.trim(),
      });
    }
  };

  const handleDeleteRequest = (id: number) => {
    if (confirm("Are you sure you want to delete this leave request?")) {
      deleteLeaveRequestMutation.mutate(id);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting || createLeaveRequestMutation.isPending) {
      console.log("Submission blocked - already in progress");
      return;
    }

    setIsSubmitting(true);

    if (!selectedLeaveType) {
      toast({
        title: "Validation Error",
        description: "Please select a leave type",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const formDataObj = new FormData(event.currentTarget);
    const startDateStr = formDataObj.get("startDate") as string;
    const endDateStr = formDataObj.get("endDate") as string;
    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T00:00:00");
    const isStartHalfDay = formDataObj.get("startHalfDay") === "on";
    const isEndHalfDay = formDataObj.get("endHalfDay") === "on";

    // Get description from form field directly
    const formDescription = (formDataObj.get("description") as string) || "";

    // Validate that selected dates are working days - but only if work pattern is loaded
    if (!workPatternLoading && workPattern) {
      console.log("🔍 [Working Day Validation] Checking dates:", {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        startDateDay: startDate.getDay(), // 0=Sunday, 1=Monday, etc.
        endDateDay: endDate.getDay(),
        isStartWorkingDay: isWorkingDay(startDate),
        isEndWorkingDay: isWorkingDay(endDate),
        workPattern: workPattern?.patternName,
        nonWorkingDays: workPattern?.nonWorkingDays,
      });

      if (!isWorkingDay(startDate) || !isWorkingDay(endDate)) {
        // Get work pattern info for better error message
        const patternInfo = workPattern
          ? `According to your work pattern "${workPattern.patternName}", `
          : "";
        const nonWorkingDaysInfo =
          workPattern?.nonWorkingDays?.[0]?.days?.join(", ") || "weekends";

        toast({
          title: "Invalid Date Selection",
          description: `${patternInfo}${nonWorkingDaysInfo} are non-working days. Please select only working days.`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // If work pattern not loaded, use simple weekend check as fallback
      const isStartWeekend =
        startDate.getDay() === 0 || startDate.getDay() === 6;
      const isEndWeekend = endDate.getDay() === 0 || endDate.getDay() === 6;

      console.log(
        "🔍 [Fallback Weekend Check] Work pattern not loaded, using simple weekend check:",
        {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          isStartWeekend,
          isEndWeekend,
          workPatternLoading,
          workPatternExists: !!workPattern,
        },
      );

      if (isStartWeekend || isEndWeekend) {
        toast({
          title: "Invalid Date Selection",
          description:
            "Please select working days only. Weekends are not allowed.",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate working days correctly
    let workingDays = calculateWorkingDays(startDate, endDate);
    let totalDays = workingDays; // Use working days for consistency

    console.log("📅 INITIAL CALCULATION:", workingDays, "working days");

    // Debug working days calculation
    console.log("=== WORKING DAYS CALCULATION DEBUG ===");
    console.log("Start Date:", startDate.toISOString().split("T")[0]);
    console.log("End Date:", endDate.toISOString().split("T")[0]);
    console.log("Calculated Working Days:", workingDays);
    console.log("Work Pattern Loading Status:", workPatternLoading);
    console.log("Work Pattern Data:", workPattern);
    console.log(
      "Available Holidays from useWorkPattern:",
      workPatternHolidays?.length || 0,
    );
    console.log("Holidays Array Length:", holidaysArray.length);
    console.log("Full Holidays Array:", holidaysArray);

    // Check if Aug 15th is in the date range and if it's a holiday
    const aug15 = new Date("2025-08-15");
    if (startDate <= aug15 && aug15 <= endDate) {
      console.log("Aug 15th is in range - checking if holiday");
      console.log("Aug 15th is holiday (useWorkPattern):", isHoliday(aug15));
      console.log(
        "Aug 15th holiday details (useWorkPattern):",
        getHolidayDetails(aug15),
      );

      // Manual check for Aug 15th in holidays array
      const aug15String = "2025-08-15";
      const holidayFound = holidaysArray.find((h) => {
        if (!h.selectedDate) return false;
        const hDate = new Date(h.selectedDate).toISOString().split("T")[0];
        return hDate === aug15String;
      });
      console.log("Manual Aug 15th holiday search result:", holidayFound);
    }

    // Debug each day in the range
    console.log("=== DAY BY DAY ANALYSIS ===");
    const debugDate = new Date(startDate);
    while (debugDate <= endDate) {
      const dateStr = debugDate.toISOString().split("T")[0];
      console.log(
        `${dateStr}: Working Day=${isWorkingDay(debugDate)}, Holiday=${isHoliday(debugDate)}`,
      );
      debugDate.setDate(debugDate.getDate() + 1);
    }
    console.log("===============================");

    // Use dynamic holiday calculation from useWorkPattern hook
    console.log("✅ Using dynamic working days calculation:", workingDays);

    // Apply half day adjustments
    if (startDate.getTime() === endDate.getTime()) {
      // Same day - either full day or half day
      if (isStartHalfDay || isEndHalfDay) {
        workingDays = 0.5;
        totalDays = 0.5;
      }
    } else {
      // Multiple days - adjust for half days
      if (isStartHalfDay) {
        workingDays -= 0.5;
        totalDays -= 0.5;
      }
      if (isEndHalfDay) {
        workingDays -= 0.5;
        totalDays -= 0.5;
      }
    }

    // Validate on-behalf selection
    if (applyOnBehalf && !selectedEmployeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee when applying on behalf",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing validation errors
    setValidationErrors([]);

    // Run comprehensive validation
    const errors = validateLeaveApplication(
      selectedLeaveType,
      startDate,
      endDate,
      workingDays,
    );
    console.log("Validation errors:", errors);

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: errors[0], // Show first error in toast
        variant: "destructive",
      });
      return;
    }

    // Use selectedEmployeeId if applying on behalf, otherwise current user
    const targetUserId =
      applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : currentUserId;

    // Check for blackout period conflicts
    const blackoutConflict = checkBlackoutPeriodConflict(
      targetUserId,
      startDate,
      endDate,
    );
    if (blackoutConflict) {
      setValidationErrors([blackoutConflict]);
      toast({
        title: "Blackout Period Restriction",
        description: blackoutConflict,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Upload documents first if any exist
    let documentUrls: string[] = [];
    if (formData.documents.length > 0) {
      try {
        const uploadFormData = new FormData();
        formData.documents.forEach((file, index) => {
          uploadFormData.append("documents", file);
        });

        const uploadResponse = await fetch("/api/upload-documents", {
          method: "POST",
          headers: {
            "X-Org-Id": currentOrgId.toString(),
          },
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          documentUrls = uploadResult.documents.map((doc: any) => doc.url);
        } else {
          toast({
            title: "Upload Error",
            description: "Failed to upload documents. Please try again.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } catch (uploadError) {
        console.error("Error uploading documents:", uploadError);
        toast({
          title: "Upload Error",
          description: "Failed to upload documents. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const data = {
      userId: targetUserId,
      leaveTypeId: selectedLeaveType.leaveTypeId,
      startDate: (formDataObj.get("startDate") as string) + "T00:00:00",
      endDate: (formDataObj.get("endDate") as string) + "T00:00:00",
      totalDays,
      workingDays,
      reason: formDataObj.get("reason") as string,
      description: formData.description,
      documents: documentUrls,
      status: "pending",
    };

    if (editingRequest) {
      updateLeaveRequestMutation.mutate({ id: editingRequest.id, data });
    } else {
      createLeaveRequestMutation.mutate(data);
    }
  };

  // Calculate summary stats - ensure leaveRequests is always an array
  const requestsArray = Array.isArray(leaveRequests) ? leaveRequests : [];

  // Sort requests to prioritize withdrawal_pending (most recent actions) at the top
  const sortedRequestsArray = requestsArray.sort((a: any, b: any) => {
    // Prioritize withdrawal_pending requests first
    if (a.status === "withdrawal_pending" && b.status !== "withdrawal_pending")
      return -1;
    if (b.status === "withdrawal_pending" && a.status !== "withdrawal_pending")
      return 1;

    // Then sort by creation date (most recent first)
    const dateA = new Date(a.createdAt || a.startDate).getTime();
    const dateB = new Date(b.createdAt || b.startDate).getTime();
    return dateB - dateA;
  });

  const totalLeaves = requestsArray.length;
  const pendingApprovals = requestsArray.filter(
    (req: any) => req.status === "pending",
  ).length;

  // Debug logging to see what data we're getting
  console.log("=== BALANCE CALCULATION DEBUG ===");
  console.log("Current user ID:", currentUserId);
  console.log("User assignments:", userAssignments);
  console.log("Assigned variant IDs:", assignedVariantIds);
  console.log("Available leave variants:", availableLeaveVariants);
  console.log("Leave balances for user", currentUserId, ":", balancesArray);
  console.log("Raw leaveBalances from API:", leaveBalances);
  console.log("All assignments array from API:", allAssignments);
  console.log("All assignments length:", allAssignments.length);

  // Debug filtered balances for summary cards
  const filteredBalances = balancesArray.filter((balance: any) =>
    assignedVariantIds.includes(balance.leaveVariantId),
  );
  console.log("Filtered balances for summary cards:", filteredBalances);
  console.log(
    "Total entitlement calculation:",
    filteredBalances.map((b) => ({
      variantId: b.leaveVariantId,
      totalEntitlement: b.totalEntitlement,
      parsed: parseFloat(b.totalEntitlement || "0"),
    })),
  );
  const totalEntitlementSum = filteredBalances.reduce(
    (total: number, balance: any) =>
      total + parseFloat(balance.totalEntitlement || "0"),
    0,
  );
  console.log("Total entitlement sum:", totalEntitlementSum);

  // Calculate total balance correctly: sum of all positive current balances only for assigned variants
  const totalBalance = filteredBalances.reduce((sum: number, balance: any) => {
    // Balance is already stored in full days
    const balanceInDays = parseFloat(balance.currentBalance || "0");
    // Only include positive balances in total (exclude negative/overdrawn balances)
    return sum + (balanceInDays > 0 ? balanceInDays : 0);
  }, 0);

  console.log("=== TOTAL BALANCE CALCULATION ===");
  console.log(
    "Filtered balances used for total:",
    filteredBalances.map((b) => ({
      variantId: b.leaveVariantId,
      currentBalance: b.currentBalance,
      parsed: parseFloat(b.currentBalance || "0"),
    })),
  );
  console.log("Step by step calculation:");
  filteredBalances.forEach((balance: any, index: number) => {
    const balanceInDays = parseFloat(balance.currentBalance || "0");
    const shouldInclude = balanceInDays > 0;
    console.log(
      `  ${index + 1}. Variant ${balance.leaveVariantId}: ${balance.currentBalance} -> ${balanceInDays} (include: ${shouldInclude})`,
    );
  });
  console.log("Total balance result:", totalBalance);
  console.log("Should equal sum of visible balances: 13.5 + 4.0 + 9.0 = 26.5");
  console.log("==================================");

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Leave Applications
            </h1>
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>

              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Apply for Leave
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex gap-4 mb-6">
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    // FIXED: Calculate TOTAL ELIGIBILITY (Opening Balance + Eligibility) - matches table
                    let totalEligibilitySum = 0;

                    availableLeaveVariants.forEach((variant: any) => {
                      const balance = balancesArray.find(
                        (b: any) => b.leaveVariantId === variant.id,
                      );
                      const transactions = Array.isArray(leaveTransactions)
                        ? leaveTransactions.filter(
                            (t: any) => t.leaveVariantId === variant.id,
                          )
                        : [];

                      // Calculate opening balance from imported Excel data transactions
                      const openingBalanceTransactions = transactions
                        .filter(
                          (t: any) =>
                            t.transactionType === "grant" &&
                            t.description
                              ?.toLowerCase()
                              .includes("opening balance imported from excel"),
                        )
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        );

                      const openingBalance =
                        openingBalanceTransactions.length > 0
                          ? parseFloat(
                              openingBalanceTransactions[0].amount || "0",
                            )
                          : 0;

                      const currentBalanceInDays = balance
                        ? parseFloat(balance.currentBalance || "0")
                        : 0;

                      // Calculate eligibility based on leave grant method
                      const totalEntitlementInDays = balance
                        ? parseFloat(balance.totalEntitlement || "0")
                        : 0;
                      const isAfterEarning =
                        variant.grantLeaves === "after_earning";

                      let eligibility = 0;

                      // CORRECTED ALGORITHMIC CALCULATION for After Earning vs In Advance
                      console.log(
                        `🔍 [ELIGIBILITY DEBUG] ${variant.leaveTypeName}:`,
                        {
                          grantLeaves: variant.grantLeaves,
                          grantFrequency: variant.grantFrequency,
                          isAfterEarning,
                          totalEntitlementInDays,
                          currentBalanceInDays,
                          openingBalance,
                          paidDaysInYear: variant.paidDaysInYear,
                        },
                      );

                      if (isAfterEarning) {
                        // "After Earning" - calculate based on annual entitlement and months completed
                        const currentMonth = new Date().getMonth() + 1; // July = 7
                        const monthsCompleted = currentMonth - 1; // 6 months completed (Jan-June)
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;
                        eligibility =
                          (annualEntitlement / 12) * monthsCompleted;
                      } else {
                        // "In Advance" - check grant frequency
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;

                        if (variant.grantFrequency === "per_year") {
                          // Annual grants like Paternity Leave - full entitlement available immediately
                          eligibility = annualEntitlement;
                        } else {
                          // Monthly grants - pro-rated amount for current month
                          const currentMonth = new Date().getMonth() + 1; // July = 7
                          eligibility = (annualEntitlement / 12) * currentMonth;
                        }
                      }
                      const totalEligibility = eligibility + openingBalance;

                      totalEligibilitySum += totalEligibility;
                    });

                    return totalEligibilitySum.toFixed(1);
                  })()}
                </div>
                <p className="text-sm text-gray-600 mt-2">Total Leaves</p>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {(() => {
                    // Calculate total availed from transactions only (actual leave usage, not grants)
                    // Include imported leave transactions as they represent actual leave usage
                    const allUserTransactions = (
                      leaveTransactions as any[]
                    ).filter((t: any) => t.userId === currentUserId);

                    console.log(
                      `💳 [TOTAL AVAILED CALCULATION] Starting calculation:`,
                      {
                        totalTransactions: leaveTransactions.length,
                        userTransactions: allUserTransactions.length,
                        currentUserId,
                        availableVariants: availableLeaveVariants?.length || 0,
                        requestsArrayLength: requestsArray.length,
                        variantIds: availableLeaveVariants
                          .slice(0, 3)
                          .map((v) => v.id),
                        sampleRequestVariantIds: requestsArray
                          .slice(0, 5)
                          .map((r) => r.leaveVariantId),
                      },
                    );

                    let totalAvailed = 0;

                    // CORRECTED TOTAL AVAILED: Count actual leave usage from requests
                    availableLeaveVariants.forEach((variant: any) => {
                      const isBeforeWorkflow =
                        variant.leaveBalanceDeductionBefore === true;

                      // FIXED: Handle null leaveVariantId by using leaveTypeId as fallback with type conversion
                      let debugCounter = 0;
                      const matchingRequests = requestsArray.filter(
                        (req: any) => {
                          const variantIdMatch =
                            req.leaveVariantId === variant.id;
                          const typeIdMatch =
                            (req.leaveVariantId === null ||
                              req.leaveVariantId === undefined) &&
                            (req.leaveTypeId === variant.leaveTypeId ||
                              String(req.leaveTypeId) ===
                                String(variant.leaveTypeId) ||
                              Number(req.leaveTypeId) ===
                                Number(variant.leaveTypeId));

                          // Debug the first 3 requests for Earned Leave to see why matching fails
                          if (
                            variant.leaveTypeName === "Earned Leave" &&
                            debugCounter < 3
                          ) {
                            console.log(
                              `🔍 MATCHING DEBUG for ${variant.leaveTypeName} (request ${debugCounter + 1}):`,
                              {
                                reqId: req.id,
                                reqLeaveVariantId: req.leaveVariantId,
                                reqLeaveTypeId: req.leaveTypeId,
                                reqLeaveTypeIdType: typeof req.leaveTypeId,
                                variantId: variant.id,
                                variantLeaveTypeId: variant.leaveTypeId,
                                variantLeaveTypeIdType:
                                  typeof variant.leaveTypeId,
                                variantIdMatch,
                                typeIdMatch,
                                finalMatch: variantIdMatch || typeIdMatch,
                              },
                            );
                            debugCounter++;
                          }

                          return variantIdMatch || typeIdMatch;
                        },
                      );

                      // Method 1: Count approved leave requests
                      const approvedRequests = matchingRequests.filter(
                        (req: any) => req.status === "approved",
                      );
                      const approvedDays = approvedRequests.reduce(
                        (sum: number, req: any) =>
                          sum + parseFloat(req.workingDays || "0"),
                        0,
                      );

                      // Method 2: For "Before Workflow" types, add pending requests
                      let pendingDays = 0;
                      if (isBeforeWorkflow) {
                        const pendingRequests = matchingRequests.filter(
                          (req: any) => req.status === "pending",
                        );
                        pendingDays = pendingRequests.reduce(
                          (sum: number, req: any) =>
                            sum + parseFloat(req.workingDays || "0"),
                          0,
                        );
                      }

                      // Method 3: Add imported leave usage from Excel
                      const variantTransactions = allUserTransactions.filter(
                        (t: any) => t.leaveVariantId === variant.id,
                      );
                      const importedAvailed = variantTransactions
                        .filter(
                          (t: any) =>
                            t.description
                              ?.toLowerCase()
                              .includes("imported leave transaction") &&
                            t.description?.toLowerCase().includes("availed") &&
                            (t.transactionType === "deduction" ||
                              t.transactionType === "debit"),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      const variantAvailed =
                        approvedDays + pendingDays + importedAvailed;

                      // Debug EVERY variant calculation for Total Availed card to find the issue
                      console.log(
                        `🎯 [VARIANT DEBUG] ${variant.leaveTypeName || variant.leaveVariantName}:`,
                        {
                          currentUserId,
                          variantId: variant.id,
                          variantLeaveTypeId: variant.leaveTypeId,
                          isBeforeWorkflow,
                          requestsArrayLength: requestsArray.length,
                          matchingRequests: matchingRequests.length,
                          matchingRequestSample: matchingRequests
                            .slice(0, 3)
                            .map((req) => ({
                              id: req.id,
                              leaveVariantId: req.leaveVariantId,
                              leaveTypeId: req.leaveTypeId,
                              status: req.status,
                              workingDays: req.workingDays,
                            })),
                          approvedRequests: approvedRequests.length,
                          approvedDays,
                          pendingDays,
                          importedAvailed,
                          variantAvailed,
                          runningTotal: totalAvailed + variantAvailed,
                        },
                      );

                      totalAvailed += variantAvailed;
                    });

                    console.log(
                      `💳 [TOTAL AVAILED RESULT] Final calculation:`,
                      {
                        totalAvailed,
                        formattedResult: totalAvailed.toFixed(1),
                      },
                    );

                    return totalAvailed.toFixed(1);
                  })()}
                </div>
                <p className="text-sm text-gray-600 mt-2">Total Availed</p>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {requestsArray?.filter((req: any) => req.status === "pending")
                    .length || 0}
                </div>
                <p className="text-sm text-gray-600 mt-2">Pending approvals</p>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    // FIXED: Use SAME calculation as table - closingBalance = totalEligibility - availed
                    let totalClosingBalance = 0;

                    console.log(
                      "🟢 [BALANCE CARD DEBUG] Starting calculation...",
                    );

                    availableLeaveVariants.forEach((variant: any) => {
                      const balance = balancesArray.find(
                        (b: any) => b.leaveVariantId === variant.id,
                      );
                      const transactions = Array.isArray(leaveTransactions)
                        ? leaveTransactions.filter(
                            (t: any) => t.leaveVariantId === variant.id,
                          )
                        : [];

                      // Calculate opening balance from imported Excel data transactions
                      const openingBalanceTransactions = transactions
                        .filter(
                          (t: any) =>
                            t.transactionType === "grant" &&
                            t.description
                              ?.toLowerCase()
                              .includes("opening balance imported from excel"),
                        )
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        );

                      const openingBalance =
                        openingBalanceTransactions.length > 0
                          ? parseFloat(
                              openingBalanceTransactions[0].amount || "0",
                            )
                          : 0;

                      const currentBalanceInDays = balance
                        ? parseFloat(balance.currentBalance || "0")
                        : 0;

                      // Calculate eligibility based on leave grant method
                      const totalEntitlementInDays = balance
                        ? parseFloat(balance.totalEntitlement || "0")
                        : 0;
                      const isAfterEarning =
                        variant.grantLeaves === "after_earning";

                      let eligibility = 0;

                      // CORRECTED ALGORITHMIC CALCULATION for After Earning vs In Advance
                      if (isAfterEarning) {
                        // "After Earning" - calculate based on annual entitlement and months completed
                        const currentMonth = new Date().getMonth() + 1; // July = 7
                        const monthsCompleted = currentMonth - 1; // 6 months completed (Jan-June)
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;
                        eligibility =
                          (annualEntitlement / 12) * monthsCompleted;
                      } else {
                        // "In Advance" - check grant frequency
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;

                        if (variant.grantFrequency === "per_year") {
                          // Annual grants like Paternity Leave - full entitlement available immediately
                          eligibility = annualEntitlement;
                        } else {
                          // Monthly grants - pro-rated amount for current month
                          const currentMonth = new Date().getMonth() + 1; // July = 7
                          eligibility = (annualEntitlement / 12) * currentMonth;
                        }
                      }
                      const totalEligibility = eligibility + openingBalance;

                      // Calculate availed using same logic as table
                      const isBeforeWorkflow =
                        variant.leaveBalanceDeductionBefore === true;

                      // Handle null/undefined leaveVariantId by using leaveTypeId as fallback
                      const matchingRequests = requestsArray.filter(
                        (req: any) =>
                          req.leaveVariantId === variant.id ||
                          ((req.leaveVariantId === null ||
                            req.leaveVariantId === undefined) &&
                            req.leaveTypeId === variant.leaveTypeId),
                      );

                      // Method 1: Count approved leave requests
                      const approvedRequests = matchingRequests.filter(
                        (req: any) => req.status === "approved",
                      );
                      const approvedDays = approvedRequests.reduce(
                        (sum: number, req: any) =>
                          sum + parseFloat(req.workingDays || "0"),
                        0,
                      );

                      // Method 2: For "Before Workflow" types, add active pending requests
                      let pendingDays = 0;
                      if (isBeforeWorkflow) {
                        const pendingRequests = matchingRequests.filter(
                          (req: any) => req.status === "pending",
                        );
                        pendingDays = pendingRequests.reduce(
                          (sum: number, req: any) =>
                            sum + parseFloat(req.workingDays || "0"),
                          0,
                        );
                      }

                      // Method 3: Add imported leave usage from Excel
                      const importedAvailed = transactions
                        .filter(
                          (t: any) =>
                            t.description
                              ?.toLowerCase()
                              .includes("imported leave transaction") &&
                            t.description?.toLowerCase().includes("availed") &&
                            (t.transactionType === "deduction" ||
                              t.transactionType === "debit"),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      const availed =
                        approvedDays + pendingDays + importedAvailed;

                      // Calculate closing balance as: Total Eligibility - Availed (SAME AS TABLE)
                      const closingBalance = totalEligibility - availed;

                      console.log(
                        `🟢 [BALANCE CARD] ${variant.leaveTypeName}: totalEligibility=${totalEligibility}, availed=${availed}, closingBalance=${closingBalance}`,
                      );

                      totalClosingBalance += closingBalance;
                    });

                    console.log(
                      `🟢 [BALANCE CARD RESULT] Final closing balance sum: ${totalClosingBalance}`,
                    );

                    return totalClosingBalance.toFixed(1);
                  })()}
                </div>
                <p className="text-sm text-gray-600 mt-2">Balance</p>
              </CardContent>
            </Card>
          </div>

          {/* Leave Balance Information Table */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">i</span>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Leave Balance Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Op Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Eligibility
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Total Eligibility
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Availed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        LOP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Leave Lapsed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Leave Encashed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Closing Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Max Leave Carry Forward
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableLeaveVariants.map((variant: any) => {
                      const balance = balancesArray.find(
                        (b: any) => b.leaveVariantId === variant.id,
                      );
                      const transactions = Array.isArray(leaveTransactions)
                        ? leaveTransactions.filter(
                            (t: any) => t.leaveVariantId === variant.id,
                          )
                        : [];

                      // Calculate opening balance from imported Excel data transactions
                      // ROBUST FIX: Search for opening balance transactions across all variants of the same leave type
                      // This handles cases where opening balance was imported with old variant ID but user is assigned to new variant ID
                      const openingBalanceTransactions = Array.isArray(
                        leaveTransactions,
                      )
                        ? leaveTransactions
                            .filter((t: any) => {
                              const isOpeningBalance =
                                t.transactionType === "grant" &&
                                t.description
                                  ?.toLowerCase()
                                  .includes(
                                    "opening balance imported from excel",
                                  );
                              const isForCurrentUser =
                                t.userId === currentUserId;

                              if (!isOpeningBalance || !isForCurrentUser)
                                return false;

                              // Direct variant match (preferred)
                              if (t.leaveVariantId === variant.id) return true;

                              // Cross-reference by leave type name - ENHANCED LOGIC
                              const transactionVariant =
                                availableLeaveVariants.find(
                                  (v: any) => v.id === t.leaveVariantId,
                                );

                              // First try: Match by leave type name
                              if (
                                transactionVariant?.leaveTypeName ===
                                variant.leaveTypeName
                              ) {
                                return true;
                              }

                              // Second try: Match by leaveTypeId (more robust for same leave type)
                              if (
                                transactionVariant?.leaveTypeId ===
                                variant.leaveTypeId
                              ) {
                                return true;
                              }

                              // Special case: For known Earned Leave variant mismatch (67 -> 61)
                              if (
                                variant.leaveTypeName === "Earned Leave" &&
                                ((t.leaveVariantId === 67 &&
                                  variant.id === 61) ||
                                  (t.leaveVariantId === 61 &&
                                    variant.id === 67))
                              ) {
                                return true;
                              }

                              return false;
                            })
                            .sort(
                              (a: any, b: any) =>
                                new Date(b.createdAt).getTime() -
                                new Date(a.createdAt).getTime(),
                            )
                        : [];

                      // DEBUG: Log opening balance calculation for troubleshooting
                      if (
                        variant.leaveTypeName === "Earned Leave" &&
                        currentUserId === "241"
                      ) {
                        console.log(
                          `🔍 [OPENING BALANCE DEBUG] ${variant.leaveTypeName} for user ${currentUserId}:`,
                          {
                            variantId: variant.id,
                            totalTransactions: transactions.length,
                            totalLeaveTransactions: Array.isArray(
                              leaveTransactions,
                            )
                              ? leaveTransactions.length
                              : 0,
                            openingBalanceTransactions:
                              openingBalanceTransactions.length,
                            availableVariantsCount:
                              availableLeaveVariants.length,
                            earnedLeaveVariants: availableLeaveVariants
                              .filter(
                                (v: any) => v.leaveTypeName === "Earned Leave",
                              )
                              .map((v) => ({
                                id: v.id,
                                name: v.leaveTypeName,
                                leaveTypeId: v.leaveTypeId,
                              })),
                            openingBalanceTransactionSample:
                              openingBalanceTransactions
                                .slice(0, 3)
                                .map((t) => ({
                                  id: t.id,
                                  type: t.transactionType,
                                  description: t.description,
                                  amount: t.amount,
                                  variantId: t.leaveVariantId,
                                })),
                            allOpeningBalanceTransactionsForUser: Array.isArray(
                              leaveTransactions,
                            )
                              ? leaveTransactions
                                  .filter(
                                    (t) =>
                                      t.userId === currentUserId &&
                                      t.transactionType === "grant" &&
                                      t.description
                                        ?.toLowerCase()
                                        .includes("opening balance"),
                                  )
                                  .map((t) => ({
                                    id: t.id,
                                    type: t.transactionType,
                                    description: t.description,
                                    amount: t.amount,
                                    variantId: t.leaveVariantId,
                                    variantName:
                                      availableLeaveVariants.find(
                                        (v: any) => v.id === t.leaveVariantId,
                                      )?.leaveTypeName || "UNKNOWN",
                                  }))
                              : [],
                          },
                        );
                      }

                      // Database now stores in full day units, no conversion needed
                      const openingBalance = openingBalanceTransactions.reduce(
                        (sum: number, t: any) => {
                          // Debug each opening balance transaction being added
                          if (
                            currentUserId === "241" &&
                            variant.leaveTypeName === "Earned Leave"
                          ) {
                            console.log(
                              `🔍 [OPENING BALANCE CALC] Adding transaction ${t.id}:`,
                              {
                                amount: t.amount,
                                description: t.description,
                                variantId: t.leaveVariantId,
                                currentSum: sum,
                                newSum: sum + parseFloat(t.amount || "0"),
                              },
                            );
                          }
                          return sum + parseFloat(t.amount || "0");
                        },
                        0,
                      );

                      // For "After Earning" leave types, eligibility should be the calculated earned amount based on months elapsed
                      // For "In Advance" leave types, eligibility should be total entitlement minus opening balance
                      const isAfterEarning =
                        variant.grantLeaves === "after_earning";
                      const currentBalanceInDays = balance
                        ? parseFloat(balance.currentBalance || "0")
                        : 0;
                      const totalEntitlementInDays = balance
                        ? parseFloat(balance.totalEntitlement || "0")
                        : 0;

                      // FIXED: Calculate eligibility based on leave grant method
                      let eligibility = 0;

                      // CORRECTED ALGORITHMIC CALCULATION for After Earning vs In Advance
                      if (isAfterEarning) {
                        // "After Earning" - calculate based on annual entitlement and months completed
                        const currentMonth = new Date().getMonth() + 1; // July = 7
                        const monthsCompleted = currentMonth - 1; // 6 months completed (Jan-June)
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;
                        eligibility =
                          (annualEntitlement / 12) * monthsCompleted;
                      } else {
                        // "In Advance" - check grant frequency
                        const annualEntitlement =
                          totalEntitlementInDays || variant.paidDaysInYear || 0;

                        if (variant.grantFrequency === "per_year") {
                          // Annual grants like Paternity Leave - full entitlement available immediately
                          eligibility = annualEntitlement;
                        } else {
                          // Monthly grants - pro-rated amount for current month
                          const currentMonth = new Date().getMonth() + 1; // July = 7
                          eligibility = (annualEntitlement / 12) * currentMonth;
                        }
                      }

                      // DEBUG: For Earned Leave table display issue
                      if (variant.leaveTypeName === "Earned Leave") {
                        console.log(
                          `🔍 [TABLE ROW DEBUG] ${variant.leaveTypeName} for user ${currentUserId}:`,
                          {
                            currentBalanceInDays,
                            openingBalance,
                            eligibility,
                            variantId: variant.id,
                            isAfterEarning:
                              variant.grantLeaves === "after_earning",
                            grantLeaves: variant.grantLeaves,
                            calculation: `Final eligibility = ${eligibility}`,
                          },
                        );
                      }

                      const totalEligibility = eligibility + openingBalance; // eligibility + opening balance

                      // Calculate availed from transactions only (actual leave usage, not grants)
                      // Include imported leave transactions as they represent actual leave usage
                      const isBeforeWorkflow =
                        variant.leaveBalanceDeductionBefore === true;

                      // Debug logging for user 2161 (Anant)
                      if (
                        currentUserId === "2161" &&
                        (variant.leaveTypeName === "Earned Leave" ||
                          variant.leaveTypeName === "Sick Leave/ Casual Leave")
                      ) {
                        console.log(
                          `🔍 [AVAILED CALCULATION] User ${currentUserId}, ${variant.leaveTypeName}:`,
                          {
                            variantId: variant.id,
                            isBeforeWorkflow,
                            leaveBalanceDeductionBefore:
                              variant.leaveBalanceDeductionBefore,
                            totalTransactions: transactions.length,
                            pendingDeductions: transactions.filter(
                              (t) => t.transactionType === "pending_deduction",
                            ).length,
                            allPendingTransactions: transactions
                              .filter(
                                (t) =>
                                  t.transactionType === "pending_deduction",
                              )
                              .map((t) => ({
                                id: t.id,
                                amount: t.amount,
                                description: t.description,
                                variantId: t.leaveVariantId,
                              })),
                            filteredPendingForThisVariant: transactions
                              .filter(
                                (t) =>
                                  t.transactionType === "pending_deduction" &&
                                  t.leaveVariantId === variant.id,
                              )
                              .map((t) => ({
                                id: t.id,
                                amount: t.amount,
                                description: t.description,
                              })),
                          },
                        );
                      }

                      // CORRECTED AVAILED CALCULATION: Count actual leave usage, not net transactions
                      // Method: Count approved requests + active pending requests (for "Before Workflow")
                      // This prevents issues with canceled requests and multiple deduction/credit transactions

                      // DEBUG: Check if requestsArray data is available
                      if (
                        currentUserId === "2161" &&
                        variant.leaveTypeName === "Earned Leave"
                      ) {
                        console.log(
                          `🔍 [DEBUG REQUESTS DATA] User ${currentUserId}, ${variant.leaveTypeName}:`,
                          {
                            requestsArrayLength: requestsArray.length,
                            variantId: variant.id,
                            sampleRequests: requestsArray
                              .slice(0, 3)
                              .map((req) => ({
                                id: req.id,
                                userId: req.userId,
                                leaveVariantId: req.leaveVariantId,
                                status: req.status,
                                workingDays: req.workingDays,
                              })),
                            allRequestsForUser: requestsArray
                              .filter((req) => req.userId === currentUserId)
                              .map((req) => ({
                                id: req.id,
                                leaveVariantId: req.leaveVariantId,
                                status: req.status,
                                workingDays: req.workingDays,
                              })),
                          },
                        );
                      }

                      // FIXED: Handle null/undefined leaveVariantId by using leaveTypeId as fallback
                      const matchingRequests = requestsArray.filter(
                        (req: any) =>
                          req.leaveVariantId === variant.id ||
                          ((req.leaveVariantId === null ||
                            req.leaveVariantId === undefined) &&
                            req.leaveTypeId === variant.leaveTypeId),
                      );

                      // Method 1: Count approved leave requests for this variant
                      const approvedRequests = matchingRequests.filter(
                        (req: any) => req.status === "approved",
                      );
                      const approvedDays = approvedRequests.reduce(
                        (sum: number, req: any) =>
                          sum + parseFloat(req.workingDays || "0"),
                        0,
                      );

                      // Method 2: For "Before Workflow" types, add active pending requests
                      let pendingDays = 0;
                      if (isBeforeWorkflow) {
                        const pendingRequests = matchingRequests.filter(
                          (req: any) => req.status === "pending",
                        );
                        pendingDays = pendingRequests.reduce(
                          (sum: number, req: any) =>
                            sum + parseFloat(req.workingDays || "0"),
                          0,
                        );
                      }

                      // Method 3: Add imported leave usage from Excel (availed transactions)
                      const importedAvailed = transactions
                        .filter(
                          (t: any) =>
                            t.description
                              ?.toLowerCase()
                              .includes("imported leave transaction") &&
                            t.description?.toLowerCase().includes("availed") &&
                            (t.transactionType === "deduction" ||
                              t.transactionType === "debit"),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      const availed =
                        approvedDays + pendingDays + importedAvailed;

                      // Debug corrected availed calculation for Anant
                      if (
                        currentUserId === "2161" &&
                        (variant.leaveTypeName === "Earned Leave" ||
                          variant.leaveTypeName === "Sick Leave/ Casual Leave")
                      ) {
                        console.log(
                          `✅ [CORRECTED AVAILED] ${variant.leaveTypeName}:`,
                          {
                            variantId: variant.id,
                            isBeforeWorkflow,
                            approvedRequests: approvedRequests.length,
                            approvedDays,
                            pendingRequests: isBeforeWorkflow
                              ? requestsArray.filter(
                                  (req: any) =>
                                    req.leaveVariantId === variant.id &&
                                    req.status === "pending",
                                ).length
                              : 0,
                            pendingDays,
                            importedAvailed,
                            totalCorrectedAvailed: availed,
                          },
                        );
                      }

                      // Calculate LOP from transactions (Loss of Pay) - already in full days
                      const lop = transactions
                        .filter(
                          (t: any) =>
                            (t.transactionType === "debit" ||
                              t.transactionType === "deduction") &&
                            (t.description?.toLowerCase().includes("lop") ||
                              t.description
                                ?.toLowerCase()
                                .includes("loss of pay")),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      // Calculate encashed from transactions - already in full days
                      const encashed = transactions
                        .filter(
                          (t: any) =>
                            (t.transactionType === "debit" ||
                              t.transactionType === "deduction") &&
                            t.description?.toLowerCase().includes("encash"),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      // Calculate lapsed from transactions - already in full days
                      const lapsed = transactions
                        .filter(
                          (t: any) =>
                            (t.transactionType === "debit" ||
                              t.transactionType === "deduction") &&
                            t.description?.toLowerCase().includes("lapse"),
                        )
                        .reduce(
                          (sum: number, t: any) =>
                            sum + Math.abs(parseFloat(t.amount || "0")),
                          0,
                        );

                      // Calculate closing balance as: Total Eligibility - Availed
                      const closingBalance = totalEligibility - availed;

                      // Get max carry forward from variant configuration
                      const maxCarryForward = variant.carryForwardDays || 0;

                      return (
                        <tr key={variant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {variant.leaveTypeName || "Unknown Leave Type"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {openingBalance.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {eligibility.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {totalEligibility.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(availed || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(lop || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(lapsed || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(encashed || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {Number(closingBalance || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(maxCarryForward || 0).toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Leave Application Form Dialog */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <div style={{ display: "none" }} />
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  Apply For Leave
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Leave Type */}
                <div>
                  <Label
                    htmlFor="leaveType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Leave type
                  </Label>
                  <Select
                    name="leaveType"
                    required
                    onValueChange={handleLeaveTypeChange}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select Leave Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeaveVariants.map((variant: any) => {
                        const balance = balancesArray.find(
                          (b: any) => b.leaveVariantId === variant.id,
                        );

                        // FIXED: Use same closing balance calculation as Leave Balance Information table
                        // Calculate correct available days using same logic as closing balance
                        const transactions = Array.isArray(leaveTransactions)
                          ? leaveTransactions.filter(
                              (t: any) => t.leaveVariantId === variant.id,
                            )
                          : [];

                        // Calculate opening balance from imported Excel data transactions
                        const openingBalanceTransactions = transactions
                          .filter(
                            (t: any) =>
                              t.transactionType === "grant" &&
                              t.description
                                ?.toLowerCase()
                                .includes(
                                  "opening balance imported from excel",
                                ),
                          )
                          .sort(
                            (a: any, b: any) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime(),
                          );

                        const openingBalance =
                          openingBalanceTransactions.length > 0
                            ? parseFloat(
                                openingBalanceTransactions[0].amount || "0",
                              )
                            : 0;

                        // Calculate eligibility for this leave type
                        const isAfterEarning =
                          variant.grantLeaves === "after_earning";
                        const currentBalanceInDays = balance
                          ? parseFloat(balance.currentBalance || "0")
                          : 0;

                        let eligibility = 0;

                        // CRITICAL FIX: Use EXACT same eligibility calculation as table for both types
                        // This ensures Apply form shows identical closing balance as Leave Balance Information table
                        const totalEntitlementInDays = balance
                          ? parseFloat(balance.totalEntitlement || "0")
                          : 0;

                        // CORRECTED ALGORITHMIC CALCULATION for After Earning vs In Advance
                        if (isAfterEarning) {
                          // "After Earning" - calculate based on annual entitlement and months completed
                          const currentMonth = new Date().getMonth() + 1; // July = 7
                          const monthsCompleted = currentMonth - 1; // 6 months completed (Jan-June)
                          const annualEntitlement =
                            totalEntitlementInDays ||
                            variant.paidDaysInYear ||
                            0;
                          eligibility =
                            (annualEntitlement / 12) * monthsCompleted;
                        } else {
                          // "In Advance" - check grant frequency
                          const annualEntitlement =
                            totalEntitlementInDays ||
                            variant.paidDaysInYear ||
                            0;

                          if (variant.grantFrequency === "per_year") {
                            // Annual grants like Paternity Leave - full entitlement available immediately
                            eligibility = annualEntitlement;
                          } else {
                            // Monthly grants - pro-rated amount for current month
                            const currentMonth = new Date().getMonth() + 1; // July = 7
                            eligibility =
                              (annualEntitlement / 12) * currentMonth;
                          }
                        }

                        const totalEligibility = eligibility + openingBalance;

                        // Calculate availed using same logic as table
                        const isBeforeWorkflow =
                          variant?.leaveBalanceDeductionBefore === true;

                        // FIXED: Handle null/undefined leaveVariantId by using leaveTypeId as fallback
                        const matchingRequests = requestsArray.filter(
                          (req: any) =>
                            req.leaveVariantId === variant.id ||
                            ((req.leaveVariantId === null ||
                              req.leaveVariantId === undefined) &&
                              req.leaveTypeId === variant.leaveTypeId),
                        );

                        // Method 1: Count approved leave requests for this variant
                        const approvedRequests = matchingRequests.filter(
                          (req: any) => req.status === "approved",
                        );
                        const approvedDays = approvedRequests.reduce(
                          (sum: number, req: any) =>
                            sum + parseFloat(req.workingDays || "0"),
                          0,
                        );

                        // Method 2: For "Before Workflow" types, add active pending requests
                        let pendingDays = 0;
                        if (isBeforeWorkflow) {
                          const pendingRequests = matchingRequests.filter(
                            (req: any) => req.status === "pending",
                          );
                          pendingDays = pendingRequests.reduce(
                            (sum: number, req: any) =>
                              sum + parseFloat(req.workingDays || "0"),
                            0,
                          );
                        }

                        // Method 3: Add imported leave usage from Excel (availed transactions)
                        const importedAvailed = transactions
                          .filter(
                            (t: any) =>
                              t.description
                                ?.toLowerCase()
                                .includes("imported leave transaction") &&
                              t.description
                                ?.toLowerCase()
                                .includes("availed") &&
                              (t.transactionType === "deduction" ||
                                t.transactionType === "debit"),
                          )
                          .reduce(
                            (sum: number, t: any) =>
                              sum + Math.abs(parseFloat(t.amount || "0")),
                            0,
                          );

                        const availed =
                          approvedDays + pendingDays + importedAvailed;

                        // Calculate closing balance as: Total Eligibility - Availed (same as table)
                        const availableDays = totalEligibility - availed;

                        // Debug for Earned Leave
                        if (variant.leaveTypeName === "Earned Leave") {
                          console.log(
                            "🔍 [APPLY FORM DEBUG] Earned Leave calculation:",
                            {
                              variantId: variant.id,
                              openingBalance,
                              eligibility,
                              totalEligibility,
                              approvedDays,
                              pendingDays,
                              importedAvailed,
                              availed,
                              availableDays,
                              currentBalanceInDays,
                              isAfterEarning,
                              isBeforeWorkflow,
                            },
                          );
                        }

                        return (
                          <SelectItem
                            key={variant.id}
                            value={variant.id.toString()}
                          >
                            {variant.leaveTypeName} ({variant.leaveVariantName})
                            - {availableDays.toFixed(1)} days available
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Show leave type specific information */}
                  {selectedLeaveType && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Leave Type Requirements:
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {selectedLeaveType.minDaysRequired > 0 && (
                          <li>
                            • Minimum {selectedLeaveType.minDaysRequired} days
                            required
                          </li>
                        )}
                        {selectedLeaveType.maxDaysInStretch > 0 && (
                          <li>
                            • Maximum {selectedLeaveType.maxDaysInStretch} days
                            in a single application
                          </li>
                        )}
                        {selectedLeaveType.mustBePlannedInAdvance > 0 && (
                          <li>
                            • Must be planned{" "}
                            {selectedLeaveType.mustBePlannedInAdvance} days in
                            advance
                          </li>
                        )}
                        {selectedLeaveType.supportingDocuments && (
                          <li>
                            • Supporting documents{" "}
                            {selectedLeaveType.supportingDocumentsText ||
                              "required"}
                          </li>
                        )}
                        {selectedLeaveType.maxInstances > 0 && (
                          <li>
                            • Maximum {selectedLeaveType.maxInstances}{" "}
                            applications per{" "}
                            {selectedLeaveType.maxInstancesPeriod}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="startDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      Start date
                    </Label>
                    <Input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      placeholder="mm/dd/yyyy"
                      className="mt-1"
                      min={minDate}
                      max={maxDate}
                      required
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData((prev) => {
                          const updated = { ...prev, startDate: newValue };
                          // Reset end date if it's before the new start date
                          if (updated.endDate && updated.endDate < newValue) {
                            updated.endDate = "";
                          }
                          // Trigger validation after both dates are set
                          if (updated.endDate) {
                            console.log(
                              "🗓️ [START DATE] Triggering validation with dates:",
                              updated.startDate,
                              updated.endDate,
                            );
                            setTimeout(() => {
                              // Create updated form data with current values
                              const tempFormData = {
                                ...formData,
                                startDate: newValue,
                              };
                              validateDatesWithData(tempFormData);
                            }, 100);
                          }
                          return updated;
                        });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Working days only (Monday-Friday)
                    </p>
                    {selectedLeaveType?.minimumLeaveUnit?.includes(
                      "half_day",
                    ) && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          name="startHalfDay"
                          id="startHalfDay"
                          checked={halfDaySelections.startHalfDay}
                          onCheckedChange={(checked) =>
                            setHalfDaySelections((prev) => ({
                              ...prev,
                              startHalfDay: !!checked,
                            }))
                          }
                        />
                        <Label htmlFor="startHalfDay" className="text-sm">
                          Half day
                        </Label>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="endDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      End date
                    </Label>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      placeholder="mm/dd/yyyy"
                      className="mt-1"
                      min={formData.startDate || minDate}
                      max={maxDate}
                      required
                      onChange={(e) => {
                        const newValue = e.target.value;
                        console.log(
                          "🗓️ [END DATE] User entered end date:",
                          newValue,
                        );
                        setFormData((prev) => {
                          const updated = { ...prev, endDate: newValue };
                          console.log(
                            "🗓️ [END DATE] Updated form data:",
                            updated,
                          );
                          // Trigger validation when end date is set and we have both dates
                          if (updated.startDate && updated.endDate) {
                            console.log(
                              "🗓️ [END DATE] Both dates present, triggering validation in 100ms",
                            );
                            setTimeout(() => {
                              console.log(
                                "🗓️ [END DATE] Calling validateDatesWithData now",
                              );
                              // Create updated form data with current values
                              const tempFormData = {
                                ...formData,
                                endDate: newValue,
                              };
                              validateDatesWithData(tempFormData);
                            }, 100);
                          }
                          return updated;
                        });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Working days only (Monday-Friday)
                    </p>
                    {selectedLeaveType?.minimumLeaveUnit?.includes(
                      "half_day",
                    ) && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          name="endHalfDay"
                          id="endHalfDay"
                          checked={halfDaySelections.endHalfDay}
                          onCheckedChange={(checked) =>
                            setHalfDaySelections((prev) => ({
                              ...prev,
                              endHalfDay: !!checked,
                            }))
                          }
                        />
                        <Label htmlFor="endHalfDay" className="text-sm">
                          Half day
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Days Display */}
                {formData.startDate && formData.endDate && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">
                          Total Leave Days Selected
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          From{" "}
                          {new Date(formData.startDate).toLocaleDateString()} to{" "}
                          {new Date(formData.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-900">
                          {(() => {
                            const totalDays = calculateTotalWorkingDays();
                            return totalDays.toFixed(
                              totalDays % 1 === 0 ? 0 : 1,
                            );
                          })()}
                        </div>
                        <div className="text-sm text-blue-700">
                          working days
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Errors Display */}
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">
                      Validation Errors:
                    </h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting Documents */}
                {selectedLeaveType?.supportingDocuments && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Supporting Documents *
                    </Label>
                    <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          <label htmlFor="documents" className="cursor-pointer">
                            <span className="text-sm text-blue-600 hover:text-blue-500">
                              Upload documents
                            </span>
                            <input
                              id="documents"
                              name="documents"
                              type="file"
                              multiple
                              className="sr-only"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setFormData((prev) => ({
                                  ...prev,
                                  documents: files,
                                }));
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, Word, or Image files (max 5MB each)
                        </p>
                      </div>
                      {formData.documents.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Selected files:
                          </h5>
                          <div className="space-y-1">
                            {formData.documents.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-sm text-gray-600"
                              >
                                <span>{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      documents: prev.documents.filter(
                                        (_, i) => i !== index,
                                      ),
                                    }));
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedLeaveType?.supportingDocumentsText && (
                      <p className="text-xs text-gray-600 mt-2">
                        {selectedLeaveType.supportingDocumentsText}
                      </p>
                    )}
                  </div>
                )}

                {/* Apply on behalf checkbox */}
                {permissions?.permissions?.allowOnBehalf?.leave === true && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        name="applyOnBehalf"
                        id="applyOnBehalf"
                        checked={applyOnBehalf}
                        onCheckedChange={(checked) => {
                          setApplyOnBehalf(!!checked);
                          if (!checked) {
                            setSelectedEmployeeId("");
                          }
                        }}
                      />
                      <Label htmlFor="applyOnBehalf" className="text-sm">
                        Apply on behalf of someone else
                      </Label>
                    </div>

                    {/* Employee dropdown - only show when checkbox is checked */}
                    {applyOnBehalf && (
                      <div>
                        <Label
                          htmlFor="employee"
                          className="text-sm font-medium text-gray-700"
                        >
                          Select Employee *
                        </Label>
                        <Select
                          value={selectedEmployeeId}
                          onValueChange={setSelectedEmployeeId}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select an employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {externalEmployees.map((employee) => (
                              <SelectItem
                                key={employee.user_id}
                                value={employee.user_id}
                              >
                                {employee.user_name ||
                                  `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
                                  employee.employee_number ||
                                  `Employee ${employee.user_id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Reason and Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="reason"
                      className="text-sm font-medium text-gray-700"
                    >
                      Reason for leave
                    </Label>
                    <Select name="reason" required>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select Reason for Leave" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="family">Family Emergency</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700"
                    >
                      Description{" "}
                      {selectedLeaveType?.supportingDocuments && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }));
                        // Clear validation errors when user starts typing
                        if (validationErrors.length > 0) {
                          setValidationErrors([]);
                        }
                      }}
                      placeholder="State the reason for your leave request"
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>

                {/* Assign Tasks */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      Assign Tasks
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-green-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Error Message for Applicable After */}
                {applicableAfterError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Leave Type Not Available
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{applicableAfterError}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaborative Leave Integration */}
                {collaborativeSettings?.enabled && (
                  <div className="border-t pt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        Task Assignment (Optional)
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Assign tasks to colleagues to ensure smooth operations
                        during your leave
                      </p>
                    </div>
                    <CollaborativeLeaveForm
                      leaveRequestId={undefined} // Will be set after leave request creation
                      className="mb-4"
                      onTasksChange={(tasks) => {
                        // Update the collaborative tasks in the form data
                        setCollaborativeTasks(tasks);
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="text-green-600 border-green-600"
                  >
                    Discard
                  </Button>
                  <Button
                    type="submit"
                    className={`text-white ${validationErrors.length > 0 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                    disabled={
                      createLeaveRequestMutation.isPending ||
                      isSubmitting ||
                      !isLeaveTypeEligible ||
                      validationErrors.length > 0
                    }
                  >
                    {createLeaveRequestMutation.isPending || isSubmitting
                      ? "Submitting..."
                      : validationErrors.length > 0
                        ? "Fix Validation Errors"
                        : "Apply for Leave"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Leave Request Dialog */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) {
                setEditingRequest(null);
                setSelectedLeaveType(null);
                setValidationErrors([]);
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  Edit Leave Request
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Leave Type */}
                <div>
                  <Label
                    htmlFor="leaveType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Leave type
                  </Label>
                  <Select
                    name="leaveType"
                    required
                    onValueChange={handleLeaveTypeChange}
                    defaultValue={editingRequest?.variantId?.toString() || ""}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select Leave Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeaveVariants.map((variant: any) => {
                        const balance = balancesArray.find(
                          (b: any) => b.leaveVariantId === variant.id,
                        );
                        const availableDays = balance
                          ? Math.max(
                              0,
                              parseFloat(balance.currentBalance || "0"),
                            )
                          : 0;
                        return (
                          <SelectItem
                            key={variant.id}
                            value={variant.id.toString()}
                          >
                            {variant.leaveTypeName} ({variant.leaveVariantName})
                            - {availableDays.toFixed(1)} days available
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="startDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      Start date
                    </Label>
                    <Input
                      type="date"
                      name="startDate"
                      placeholder="mm/dd/yyyy"
                      className="mt-1"
                      min={minDate}
                      defaultValue={
                        editingRequest
                          ? new Date(editingRequest.startDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={validateDates}
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="endDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      End date
                    </Label>
                    <Input
                      type="date"
                      name="endDate"
                      placeholder="mm/dd/yyyy"
                      className="mt-1"
                      min={minDate}
                      defaultValue={
                        editingRequest
                          ? new Date(editingRequest.endDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={validateDates}
                      required
                    />
                  </div>
                </div>

                {/* Half Day Options */}
                {selectedLeaveType?.minimumLeaveUnit?.includes("half_day") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox name="startHalfDay" />
                      <Label className="text-sm text-gray-700">
                        Start date half day
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox name="endHalfDay" />
                      <Label className="text-sm text-gray-700">
                        End date half day
                      </Label>
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <Label
                    htmlFor="reason"
                    className="text-sm font-medium text-gray-700"
                  >
                    Reason for Leave
                  </Label>
                  <Textarea
                    name="reason"
                    placeholder="Enter reason for leave"
                    className="mt-1"
                    rows={3}
                    defaultValue={editingRequest?.reason || ""}
                    required
                  />
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">
                      Please fix the following errors:
                    </h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="text-gray-600 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={
                      updateLeaveRequestMutation.isPending ||
                      validationErrors.length > 0
                    }
                  >
                    {updateLeaveRequestMutation.isPending
                      ? "Updating..."
                      : "Update Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Leave Applications Table */}
          <Card>
            <CardContent className="p-6">
              {(leaveRequests as any[]).length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No leave applications found for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Leave Type
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          From
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          To
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Days
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Reason
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRequestsArray.map((request: any) => {
                        const typesArray = Array.isArray(leaveTypes)
                          ? leaveTypes
                          : [];
                        const leaveType = typesArray.find(
                          (type) => type.id === request.leaveTypeId,
                        );
                        const variantsArray = Array.isArray(leaveVariants)
                          ? leaveVariants
                          : [];
                        const leaveVariant = variantsArray.find(
                          (variant) =>
                            variant.leaveTypeId === request.leaveTypeId,
                        );
                        return (
                          <tr
                            key={request.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              {leaveType?.name || "Unknown"}
                            </td>
                            <td className="py-3 px-4">
                              {new Date(request.startDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              {new Date(request.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">{request.workingDays}</td>
                            <td className="py-3 px-4 capitalize">
                              {request.reason}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium inline-block w-fit ${
                                    request.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : request.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : request.status === "withdrawn"
                                          ? "bg-orange-100 text-orange-800"
                                          : request.status ===
                                              "withdrawal_pending"
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {request.status === "withdrawal_pending"
                                    ? "Withdrawal Pending"
                                    : request.status === "rejected" &&
                                        request.approvalHistory &&
                                        (request.approvalHistory as any[]).some(
                                          (h: any) =>
                                            h.action === "submitted" &&
                                            h.comment,
                                        )
                                      ? "Withdrawal Rejected"
                                      : request.status}
                                </span>
                                {request.status === "rejected" &&
                                  request.rejectedReason && (
                                    <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                      <strong>Reason:</strong>{" "}
                                      {request.rejectedReason}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                {request.status === "pending" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                      onClick={() => handleEditRequest(request)}
                                      disabled={
                                        updateLeaveRequestMutation.isPending
                                      }
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    {(leaveVariant?.allowWithdrawalBeforeApproval ||
                                      !leaveVariant?.withdrawalNotAllowed) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                        onClick={() =>
                                          handleCancelRequest(request.id)
                                        }
                                        disabled={
                                          deleteLeaveRequestMutation.isPending
                                        }
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        {deleteLeaveRequestMutation.isPending
                                          ? "Cancelling..."
                                          : "Cancel"}
                                      </Button>
                                    )}
                                  </>
                                )}
                                {request.status === "approved" &&
                                  leaveVariant?.allowWithdrawalAfterApproval && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                      onClick={() =>
                                        handleWithdrawRequest(request.id)
                                      }
                                      disabled={
                                        withdrawLeaveRequestMutation.isPending
                                      }
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      {withdrawLeaveRequestMutation.isPending
                                        ? "Withdrawing..."
                                        : "Withdraw"}
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal Request Dialog */}
          <Dialog
            open={isWithdrawDialogOpen}
            onOpenChange={(open) => {
              setIsWithdrawDialogOpen(open);
              if (!open) {
                setWithdrawingRequestId(null);
                setWithdrawalReason("");
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw Leave Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Please provide a reason for withdrawing this leave request.
                  This action may require approval before completion.
                </p>

                <div>
                  <Label
                    htmlFor="withdrawalReason"
                    className="text-sm font-medium"
                  >
                    Reason for withdrawal *
                  </Label>
                  <Textarea
                    id="withdrawalReason"
                    placeholder="Enter reason for withdrawal..."
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsWithdrawDialogOpen(false);
                      setWithdrawingRequestId(null);
                      setWithdrawalReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdrawSubmit}
                    disabled={
                      !withdrawalReason.trim() ||
                      withdrawLeaveRequestMutation.isPending
                    }
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {withdrawLeaveRequestMutation.isPending
                      ? "Submitting..."
                      : "Submit Withdrawal"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}

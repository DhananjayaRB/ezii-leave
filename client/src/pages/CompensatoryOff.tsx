import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpRight,
  Eye,
  RotateCcw,
  Plus,
  CalendarIcon,
  X,
  Trash2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";
import { useWorkPattern } from "@/hooks/useWorkPattern";

// Helper function to calculate working days (similar to LeaveApplications.tsx)
const calculateWorkingDays = (
  startDate: Date,
  endDate: Date,
  holidays: any[],
) => {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    const isWeekend = day === 0 || day === 6; // Sunday = 0, Saturday = 6
    const isHoliday = isHolidayDate(current, holidays);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
};

// Helper function to check if date is a holiday
const isHolidayDate = (date: Date, holidays: any[]) => {
  const dateString = format(date, "yyyy-MM-dd");
  return holidays.some((holiday: any) => {
    const holidayDate = new Date(holiday.selectedDate || holiday.date);
    return format(holidayDate, "yyyy-MM-dd") === dateString;
  });
};

// Helper function to check if date is a weekend (Saturday or Sunday)
const isWeekendDate = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Helper function to count comp-off applications in current month
const getMonthlyApplicationCount = (
  requests: any[],
  userId: string,
  targetDate: Date,
) => {
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  return requests.filter((request: any) => {
    if (request.userId !== userId) return false;

    const requestDate = new Date(request.appliedAt || request.createdAt);
    return (
      requestDate.getMonth() === targetMonth &&
      requestDate.getFullYear() === targetYear
    );
  }).length;
};

// Form schema for banking comp-off (worked overtime)
const createBankCompOffFormSchema = (
  holidays: any[],
  allowOnNonWorkingDays: boolean = true,
  maxApplications: number = 999,
  currentMonthCount: number = 0,
  userId: string = "",
) =>
  z
    .object({
      startDate: z.date({
        required_error: "Start date is required",
      }),
      endDate: z.date({
        required_error: "End date is required",
      }),
      dayType: z.enum(["full", "half", "quarter"], {
        required_error: "Please select full day, half day, or quarter day",
      }),
      reason: z
        .string()
        .min(1, "Reason for comp-off is required")
        .max(500, "Reason cannot exceed 500 characters"),
    })
    .refine(
      (data) => {
        return data.endDate >= data.startDate;
      },
      {
        message: "End date must be after or same as start date",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        return !isHolidayDate(data.startDate, holidays);
      },
      {
        message:
          "Cannot apply comp-off on a holiday. Please select a different start date.",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        return !isHolidayDate(data.endDate, holidays);
      },
      {
        message:
          "Cannot apply comp-off on a holiday. Please select a different end date.",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        // Only check weekends if comp-off variant doesn't allow non-working days
        if (allowOnNonWorkingDays) return true;
        return !isWeekendDate(data.startDate);
      },
      {
        message:
          "Cannot apply comp-off on weekends. This comp-off type only allows working days.",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        // Only check weekends if comp-off variant doesn't allow non-working days
        if (allowOnNonWorkingDays) return true;
        return !isWeekendDate(data.endDate);
      },
      {
        message:
          "Cannot apply comp-off on weekends. This comp-off type only allows working days.",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        // Check monthly application limit
        const monthCount = getMonthlyApplicationCount(
          [],
          userId,
          data.startDate,
        );
        return currentMonthCount < maxApplications;
      },
      {
        message: `You have reached the maximum limit of ${maxApplications} comp-off applications per month.`,
        path: ["startDate"],
      },
    );

// Form schema for availing comp-off (using banked comp-off)
const createAvailCompOffFormSchema = (
  holidays: any[],
  allowOnNonWorkingDays: boolean = true,
  maxApplications: number = 999,
  currentMonthCount: number = 0,
  userId: string = "",
) =>
  z
    .object({
      startDate: z.date({
        required_error: "Start date is required",
      }),
      endDate: z.date({
        required_error: "End date is required",
      }),
      dayType: z.enum(["full", "half", "quarter"], {
        required_error: "Please select full day, half day, or quarter day",
      }),
      reason: z
        .string()
        .min(1, "Reason for taking comp-off is required")
        .max(500, "Reason cannot exceed 500 characters"),
    })
    .refine(
      (data) => {
        return data.endDate >= data.startDate;
      },
      {
        message: "End date must be after or same as start date",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        return !isHolidayDate(data.startDate, holidays);
      },
      {
        message:
          "Cannot avail comp-off on a holiday. Please select a different start date.",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        return !isHolidayDate(data.endDate, holidays);
      },
      {
        message:
          "Cannot avail comp-off on a holiday. Please select a different end date.",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        // Only check weekends if comp-off variant doesn't allow non-working days
        if (allowOnNonWorkingDays) return true;
        return !isWeekendDate(data.startDate);
      },
      {
        message:
          "Cannot avail comp-off on weekends. This comp-off type only allows working days.",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        // Only check weekends if comp-off variant doesn't allow non-working days
        if (allowOnNonWorkingDays) return true;
        return !isWeekendDate(data.endDate);
      },
      {
        message:
          "Cannot avail comp-off on weekends. This comp-off type only allows working days.",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => {
        // Check monthly application limit
        return currentMonthCount < maxApplications;
      },
      {
        message: `You have reached the maximum limit of ${maxApplications} comp-off applications per month.`,
        path: ["startDate"],
      },
    );

// Form schema for transferring comp-off to leave
const transferToLeaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  transferDays: z
    .number()
    .min(0.5, "Minimum 0.5 days required")
    .max(30, "Maximum 30 days allowed"),
  reason: z
    .string()
    .min(1, "Reason for transfer is required")
    .max(500, "Reason cannot exceed 500 characters"),
});

// Form schema for en-cashing comp-off
const enCashFormSchema = z.object({
  enCashDays: z
    .number()
    .min(0.5, "Minimum 0.5 days required")
    .max(30, "Maximum 30 days allowed"),
  dailyRate: z.number().min(1, "Daily rate must be greater than 0"),
  reason: z
    .string()
    .min(1, "Reason for en-cash is required")
    .max(500, "Reason cannot exceed 500 characters"),
});

export default function CompensatoryOff() {
  const [activeTab, setActiveTab] = useState("All");
  const [yearFilter, setYearFilter] = useState("2024");
  const [periodFilter, setPeriodFilter] = useState("Yearly");
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showAvailDialog, setShowAvailDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEnCashDialog, setShowEnCashDialog] = useState(false);
  const [applyOnBehalf, setApplyOnBehalf] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompOffDetails, setSelectedCompOffDetails] =
    useState<any>(null);
  const { toast } = useToast();

  const permissions = usePermissions();
  const { employees: externalEmployees } = useExternalEmployeeData();

  // Get work pattern and filtered holidays for current user
  const { workPattern, isLoading: workPatternLoading } = useWorkPattern();

  // Fetch holidays from internal database API
  const { data: allHolidays = [] } = useQuery({
    queryKey: ["/api/holidays"],
    queryFn: async () => {
      const response = await fetch("/api/holidays", {
        credentials: "include",
        headers: {
          "X-Org-Id": localStorage.getItem("org_id") || "60",
        },
      });
      return response.ok ? response.json() : [];
    },
  });

  // Filter holidays based on user's work pattern
  const filteredHolidays =
    workPattern && workPattern.selectedHolidays
      ? allHolidays.filter((holiday: any) =>
          workPattern.selectedHolidays.includes(holiday.id),
        )
      : allHolidays; // Show all holidays if work pattern isn't available

  console.log("🎯 Comp-off Form Holiday Filtering:", {
    workPattern: workPattern?.patternName,
    selectedHolidayIds: workPattern?.selectedHolidays,
    allHolidays: allHolidays.length,
    filteredHolidays: filteredHolidays.length,
  });

  // Debug permissions and external employees
  useEffect(() => {
    console.log("=== COMP-OFF PERMISSION DEBUG ===");
    console.log(
      "Comp-off allowOnBehalf permission:",
      permissions?.permissions?.allowOnBehalf?.compOff,
    );
    console.log(
      "Should show checkbox?",
      permissions?.permissions?.allowOnBehalf?.compOff === true,
    );
    console.log("External employees array:", externalEmployees);
    console.log("External employees length:", externalEmployees?.length);
    console.log("Apply on behalf state:", applyOnBehalf);
    console.log("==================================");
  }, [permissions, externalEmployees, applyOnBehalf]);

  // Reset on-behalf state when all dialogs close
  useEffect(() => {
    if (
      !showBankDialog &&
      !showAvailDialog &&
      !showTransferDialog &&
      !showEnCashDialog
    ) {
      setApplyOnBehalf(false);
      setSelectedEmployeeId("");
    }
  }, [showBankDialog, showAvailDialog, showTransferDialog, showEnCashDialog]);

  // Data fetching
  const { data: compOffRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/comp-off-requests"],
  });

  const { data: compOffConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["/api/comp-off-config"],
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the response
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debug the comp-off config data structure
  console.log("🏗️ Comp-off Config Data Structure:", {
    config: compOffConfig,
    hasVariantSettings: compOffConfig?.variantSettings,
    allowOnNonWorkingDays:
      compOffConfig?.variantSettings?.allowOnNonWorkingDays,
    maxApplications: compOffConfig?.variantSettings?.maxApplicationsPerMonth,
  });

  // Force refetch when component mounts to ensure latest config
  useEffect(() => {
    // Clear any existing cache for this query
    queryClient.removeQueries({ queryKey: ["/api/comp-off-config"] });
    queryClient.invalidateQueries({ queryKey: ["/api/comp-off-config"] });
    refetchConfig();
  }, [refetchConfig]);

  // Filter available actions based on compensation options
  const getAvailableActions = () => {
    // Always allow bank and avail actions
    const baseActions = ["bank", "avail"];

    console.log("CompOff Config Data:", compOffConfig);
    console.log("Compensation Options:", compOffConfig?.compensationOptions);

    if (!compOffConfig || !compOffConfig.compensationOptions) {
      // If no config is loaded yet or no compensation options defined, show all actions
      console.log("No compensation options found, showing all actions");
      return [...baseActions, "transfer", "encash"];
    }

    const options = Array.isArray(compOffConfig.compensationOptions)
      ? compOffConfig.compensationOptions
      : [compOffConfig.compensationOptions];

    console.log("Parsed compensation options:", options);

    const availableActions = [...baseActions];

    // Add compensation options based on configuration
    if (options.includes("En-cashment")) {
      availableActions.push("encash");
      console.log("Added en-cash action");
    }

    if (options.includes("Convert to leaves")) {
      availableActions.push("transfer");
      console.log("Added transfer action");
    }

    console.log("Final available actions:", availableActions);
    return availableActions;
  };

  const availableActions = getAvailableActions();

  const { data: compOffVariants = [] } = useQuery({
    queryKey: ["/api/comp-off-variants"],
  });

  // Get current user ID
  const userId = localStorage.getItem("user_id") || "225";

  // Fetch comp off requests from API - filtered by current user
  const {
    data: compOffRecords = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/comp-off-requests", userId],
    queryFn: async () => {
      const response = await fetch(`/api/comp-off-requests?userId=${userId}`, {
        credentials: "include",
        headers: {
          "X-Org-Id": localStorage.getItem("org_id") || "",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch comp-off requests");
      }
      return response.json();
    },
  });

  // Get employee assignments to filter leave types for current user
  const { data: employeeAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  // Get all leave types and filter by user assignments
  const { data: allLeaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  // Filter leave types to only show those assigned to current user
  const leaveTypes = allLeaveTypes.filter((leaveType: any) => {
    return employeeAssignments.some(
      (assignment: any) =>
        assignment.userId === userId && assignment.leaveTypeId === leaveType.id,
    );
  });

  // Filter leave types for comp-off transfer based on variant configuration
  const transferableLeaveTypes = allLeaveTypes.filter((leaveType: any) => {
    // Check if comp-off variants exist and have convertible leave types
    if (!compOffVariants || compOffVariants.length === 0) {
      return false;
    }

    const variant = compOffVariants[0];
    if (
      !variant.convertibleLeaveTypes ||
      !Array.isArray(variant.convertibleLeaveTypes)
    ) {
      return false;
    }

    // Check if this leave type ID is in the convertible leave types array
    return variant.convertibleLeaveTypes.includes(leaveType.id);
  });

  // Get available day types from comp-off variant configuration
  const getAvailableDayTypes = () => {
    // Check if user has comp-off variant assignments
    if (!compOffVariants || compOffVariants.length === 0) {
      return [{ value: "full", label: "Full Day" }];
    }

    // Get the first assigned comp-off variant (assuming user has one primary variant)
    const variant = compOffVariants[0];
    const dayTypes = [];

    // Check variant configuration for allowed day types
    if (variant.allowFullDay) {
      dayTypes.push({ value: "full", label: "Full Day" });
    }
    if (variant.allowHalfDay) {
      dayTypes.push({ value: "half", label: "Half Day" });
    }
    if (variant.allowQuarterDay) {
      dayTypes.push({ value: "quarter", label: "Quarter Day" });
    }

    return dayTypes.length > 0
      ? dayTypes
      : [{ value: "full", label: "Full Day" }];
  };

  const availableDayTypes = getAvailableDayTypes();

  // Create comp off request mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/comp-off-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/comp-off-requests", userId],
      });
    },
  });

  // Update comp off request mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PATCH", `/api/comp-off-requests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/comp-off-requests", userId],
      });
    },
  });

  // Delete comp off request mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/comp-off-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/comp-off-requests", userId],
      });
    },
  });

  // Calculate stats from real data
  const bankedDays = compOffRecords.filter(
    (r: any) => r.type === "bank" && r.status === "approved",
  ).length;
  const availedDays = compOffRecords.filter(
    (r: any) => r.type === "avail" && r.status === "approved",
  ).length;
  const transferredDays = compOffRecords
    .filter((r: any) => r.type === "transfer" && r.status === "approved")
    .reduce(
      (sum: number, r: any) => sum + (parseFloat(r.transferAmount) || 0),
      0,
    );
  const enCashedDays = compOffRecords
    .filter((r: any) => r.type === "en_cash" && r.status === "approved")
    .reduce(
      (sum: number, r: any) => sum + (parseFloat(r.transferAmount) || 0),
      0,
    );

  const stats = {
    totalCompOffs: compOffRecords.length,
    banked: bankedDays,
    availed: availedDays,
    transferred: transferredDays,
    enCashed: enCashedDays,
    pendingApprovals: compOffRecords.filter((r: any) => r.status === "pending")
      .length,
    expired: compOffRecords.filter((r: any) => r.status === "expired").length,
    balance: bankedDays - availedDays - transferredDays - enCashedDays,
    carryForward: bankedDays,
    enCashable: bankedDays - availedDays - transferredDays - enCashedDays,
  };

  const tabs = [
    { id: "All", label: "All" },
    { id: "Pending", label: "Pending", badge: true },
    { id: "Banked", label: "Banked", badge: true },
    { id: "Availed", label: "Availed", badge: true },
    { id: "Rejected", label: "Rejected", badge: true },
    { id: "Expired", label: "Expired", badge: true },
  ];

  const getActionButton = (record: any) => {
    switch (record.status) {
      case "approved":
      case "banked":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => handleView(record)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      case "expired":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => handleReapply(record)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Re-apply
          </Button>
        );
      case "pending":
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={() => handleView(record)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Pending
          </Button>
        );
      case "rejected":
        return <div className="text-xs text-red-600 font-medium">Rejected</div>;
      default:
        return null;
    }
  };

  const handleView = (record: any) => {
    console.log("View comp off:", record);
    setSelectedCompOffDetails(record);
    setShowViewModal(true);
  };

  // Get validation settings from comp-off config
  // Based on the UI screenshot, "Not Allowed" means allowOnNonWorkingDays should be false
  let allowOnNonWorkingDays = true; // Default to allow
  let maxApplicationsPerMonth = 999; // Default to unlimited

  if (compOffConfig) {
    // Try multiple possible field names for non-working days setting
    allowOnNonWorkingDays =
      compOffConfig.allownonworkingdays ??
      compOffConfig.allowNonWorkingDays ??
      compOffConfig.allowOnNonWorkingDays ??
      compOffConfig.variantSettings?.allownonworkingdays ??
      compOffConfig.variantSettings?.allowNonWorkingDays ??
      true;

    // For max applications, handle different data structures
    const maxAppConfig = compOffConfig.maxcompoffapplications;
    if (maxAppConfig) {
      if (typeof maxAppConfig === "object" && maxAppConfig.Month) {
        maxApplicationsPerMonth = maxAppConfig.Month;
      } else if (typeof maxAppConfig === "number") {
        maxApplicationsPerMonth = maxAppConfig;
      }
    } else {
      maxApplicationsPerMonth = compOffConfig.maxApplicationsPerMonth ?? 999;
    }
  }

  const maxApplicationsPeriod = "Month";

  // Count current month's applications for the user
  const currentUserId = localStorage.getItem("user_id") || "";
  const currentOrgId = localStorage.getItem("org_id") || "13";
  const currentMonthCount = getMonthlyApplicationCount(
    compOffRequests,
    currentUserId,
    new Date(),
  );

  // TEMPORARY: Force weekend validation to test the mechanism
  // Based on the UI screenshot showing "Not Allowed", let's force this to false for testing
  allowOnNonWorkingDays = false; // Force weekend blocking for testing
  maxApplicationsPerMonth = 3; // Force the 3 application limit for testing

  console.log("🔒 Comp-off Validation Settings:", {
    allowOnNonWorkingDays,
    maxApplicationsPerMonth,
    maxApplicationsPeriod,
    currentMonthCount,
    userId: currentUserId,
    orgId: currentOrgId,
    configData: compOffConfig,
    rawConfigKeys: compOffConfig ? Object.keys(compOffConfig) : [],
    weekendValidationActive: !allowOnNonWorkingDays,
    TESTING_NOTE:
      "Temporarily forcing allowOnNonWorkingDays = false to test validation",
  });

  // Create dynamic schemas with all validation rules
  const bankCompOffFormSchema = createBankCompOffFormSchema(
    filteredHolidays,
    allowOnNonWorkingDays,
    maxApplicationsPerMonth,
    currentMonthCount,
    currentUserId,
  );
  const availCompOffFormSchema = createAvailCompOffFormSchema(
    filteredHolidays,
    allowOnNonWorkingDays,
    maxApplicationsPerMonth,
    currentMonthCount,
    currentUserId,
  );

  // Form for banking comp-off (worked overtime)
  const bankForm = useForm<z.infer<typeof bankCompOffFormSchema>>({
    resolver: zodResolver(bankCompOffFormSchema),
    defaultValues: {
      reason: "",
      dayType: availableDayTypes[0]?.value || "full",
    },
  });

  // Form for availing comp-off (using banked comp-off)
  const availForm = useForm<z.infer<typeof availCompOffFormSchema>>({
    resolver: zodResolver(availCompOffFormSchema),
    defaultValues: {
      reason: "",
      dayType: availableDayTypes[0]?.value || "full",
    },
  });

  // Form for transferring comp-off to leave
  const transferForm = useForm<z.infer<typeof transferToLeaveFormSchema>>({
    resolver: zodResolver(transferToLeaveFormSchema),
    defaultValues: {
      leaveTypeId: "",
      transferDays: 1,
      reason: "",
    },
  });

  // Form for en-cashing comp-off
  const enCashForm = useForm<z.infer<typeof enCashFormSchema>>({
    resolver: zodResolver(enCashFormSchema),
    defaultValues: {
      enCashDays: 1,
      dailyRate: 0,
      reason: "",
    },
  });

  const handleBankCompOff = () => {
    setShowBankDialog(true);
  };

  const handleAvailCompOff = () => {
    setShowAvailDialog(true);
  };

  const handleTransferToLeaveClick = () => {
    if (!availableActions.includes("transfer")) {
      toast({
        title: "Action Not Available",
        description:
          "Transfer to leaves is not enabled in your organization's compensation options",
        variant: "destructive",
      });
      return;
    }
    setShowTransferDialog(true);
  };

  const handleTransferToLeave = (
    data: z.infer<typeof transferToLeaveFormSchema>,
  ) => {
    // Use selected employee ID if applying on behalf, otherwise use current user
    const userId =
      applyOnBehalf && selectedEmployeeId
        ? selectedEmployeeId
        : localStorage.getItem("user_id") || "1";

    // Check if user has enough banked comp-off balance
    const availableBalance = stats.balance;
    if (data.transferDays > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${availableBalance} banked comp-off days available for transfer`,
        variant: "destructive",
      });
      return;
    }

    const transferData = {
      reason: data.reason,
      workedDate: new Date().toISOString().split("T")[0],
      compensateWith: "",
      notes: data.reason,
      status: "pending",
      type: "transfer",
      transferAmount: data.transferDays.toString(),
      leaveTypeId: data.leaveTypeId,
      userId,
    };

    console.log("Submitting transfer to leave data:", transferData);

    createMutation.mutate(transferData, {
      onSuccess: (responseData: any) => {
        const isAutoApproved = responseData?.status === "approved";
        toast({
          title: "Success",
          description: isAutoApproved
            ? "Transfer to leave request submitted and auto-approved successfully"
            : "Transfer to leave request submitted successfully",
        });
        setShowTransferDialog(false);
        transferForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to submit transfer request",
          variant: "destructive",
        });
      },
    });
  };

  const handleEnCashComp = () => {
    if (!availableActions.includes("encash")) {
      toast({
        title: "Action Not Available",
        description:
          "En-cash compensation is not enabled in your organization's compensation options",
        variant: "destructive",
      });
      return;
    }
    setShowEnCashDialog(true);
  };

  const onSubmitBankCompOff = (
    values: z.infer<typeof bankCompOffFormSchema>,
  ) => {
    // Apply comp-off variant validation rules
    const variant = compOffVariants[0]; // Use first variant or implement variant selection

    // Calculate working days correctly
    let workingDays = calculateWorkingDays(
      values.startDate,
      values.endDate,
      filteredHolidays,
    );

    // Use dynamic holiday calculation for comp-off working days
    const startDateStr = format(values.startDate, "yyyy-MM-dd");
    const endDateStr = format(values.endDate, "yyyy-MM-dd");
    console.log(
      "✅ Using dynamic working days calculation for comp-off:",
      workingDays,
    );

    console.log("Bank Comp-off Working Days Calculation:", {
      startDate: startDateStr,
      endDate: endDateStr,
      calculatedWorkingDays: calculateWorkingDays(
        values.startDate,
        values.endDate,
        filteredHolidays,
      ),
      finalWorkingDays: workingDays,
    });

    // Validate against comp-off rules
    if (variant) {
      const today = new Date();
      const requestDate = values.startDate;
      const daysDifference = differenceInDays(today, requestDate);

      // Check approval advance days requirement
      if (variant.approvalDays && daysDifference < variant.approvalDays) {
        toast({
          title: "Validation Error",
          description: `Comp-off request should be made at least ${variant.approvalDays} days in advance`,
          variant: "destructive",
        });
        return;
      }

      // Check if within availment period
      if (variant.availWithinDays && daysDifference > variant.availWithinDays) {
        toast({
          title: "Validation Error",
          description: `Comp-off should be availed within ${variant.availWithinDays} days from date of working`,
          variant: "destructive",
        });
        return;
      }
    }

    // Use selected employee ID if applying on behalf, otherwise use current user
    const userId =
      applyOnBehalf && selectedEmployeeId
        ? selectedEmployeeId
        : localStorage.getItem("user_id") || "1";

    const compOffData = {
      userId,
      reason: values.reason,
      workedDate: format(values.startDate, "yyyy-MM-dd"),
      compensateWith: format(values.endDate, "yyyy-MM-dd"),
      notes: `${values.reason} (${values.dayType === "half" ? "Half Day" : "Full Day"}) - ${workingDays} working days`,
      status: "pending",
      type: "bank", // Banking comp-off for overtime work
      dayType: values.dayType,
      workingDays, // Add working days to the request
    };

    console.log("Submitting bank comp-off data:", compOffData);

    createMutation.mutate(compOffData, {
      onSuccess: (data: any) => {
        const isAutoApproved = data?.status === "approved";
        toast({
          title: "Success",
          description: isAutoApproved
            ? "Comp-off banking request submitted and auto-approved successfully"
            : "Comp-off banking request submitted successfully",
        });
        setShowBankDialog(false);
        bankForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to submit comp-off banking request",
          variant: "destructive",
        });
      },
    });
  };

  const onSubmitAvailCompOff = (
    values: z.infer<typeof availCompOffFormSchema>,
  ) => {
    // Apply comp-off variant validation rules
    const variant = compOffVariants[0]; // Use first variant or implement variant selection

    // Calculate working days correctly
    let workingDays = calculateWorkingDays(
      values.startDate,
      values.endDate,
      filteredHolidays,
    );

    // Use dynamic holiday calculation for avail comp-off working days
    const startDateStr = format(values.startDate, "yyyy-MM-dd");
    const endDateStr = format(values.endDate, "yyyy-MM-dd");
    console.log(
      "✅ Using dynamic working days calculation for avail comp-off:",
      workingDays,
    );

    console.log("Avail Comp-off Working Days Calculation:", {
      startDate: startDateStr,
      endDate: endDateStr,
      calculatedWorkingDays: calculateWorkingDays(
        values.startDate,
        values.endDate,
        filteredHolidays,
      ),
      finalWorkingDays: workingDays,
    });

    // Check if user has sufficient comp-off balance
    const availableBalance = stats.balance; // From computed stats
    const requestedDays = workingDays; // Use working days instead of calendar days

    if (availableBalance < requestedDays) {
      toast({
        title: "Insufficient Balance",
        description: `You have ${availableBalance} comp-off days available, but requesting ${requestedDays} working days`,
        variant: "destructive",
      });
      return;
    }

    // Validate against comp-off rules
    if (variant) {
      const today = new Date();
      const requestDate = values.startDate;
      const daysDifference = differenceInDays(requestDate, today);

      // Check approval advance days requirement for future requests
      if (variant.approvalDays && daysDifference < variant.approvalDays) {
        toast({
          title: "Validation Error",
          description: `Comp-off request should be made at least ${variant.approvalDays} days in advance`,
          variant: "destructive",
        });
        return;
      }
    }

    const userId = localStorage.getItem("user_id") || "1";

    const compOffData = {
      userId,
      reason: values.reason,
      workedDate: format(values.startDate, "yyyy-MM-dd"), // Date taking comp-off
      compensateWith: format(values.endDate, "yyyy-MM-dd"),
      notes: `${values.reason} (${values.dayType === "half" ? "Half Day" : "Full Day"}) - ${workingDays} working days`,
      status: "pending",
      type: "avail", // Availing banked comp-off
      dayType: values.dayType,
      workingDays, // Add working days to the request
    };

    console.log("Submitting avail comp-off data:", compOffData);

    createMutation.mutate(compOffData, {
      onSuccess: (data: any) => {
        const isAutoApproved = data?.status === "approved";
        toast({
          title: "Success",
          description: isAutoApproved
            ? "Comp-off avail request submitted and auto-approved successfully"
            : "Comp-off avail request submitted successfully",
        });
        setShowAvailDialog(false);
        availForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to submit comp-off avail request",
          variant: "destructive",
        });
      },
    });
  };

  const onSubmitEnCashComp = (values: z.infer<typeof enCashFormSchema>) => {
    // Check if user has sufficient comp-off balance
    const availableBalance = stats.balance;

    if (availableBalance < values.enCashDays) {
      toast({
        title: "Insufficient Balance",
        description: `You have ${availableBalance} comp-off days available, but requesting ${values.enCashDays} days`,
        variant: "destructive",
      });
      return;
    }

    // Use selected employee ID if applying on behalf, otherwise use current user
    const userId =
      applyOnBehalf && selectedEmployeeId
        ? selectedEmployeeId
        : localStorage.getItem("user_id") || "1";
    const totalAmount = values.enCashDays * values.dailyRate;

    const compOffData = {
      userId,
      reason: values.reason,
      workedDate: new Date().toISOString().split("T")[0],
      compensateWith: "",
      notes: values.reason,
      status: "pending",
      type: "en_cash",
      enCashAmount: totalAmount.toString(),
      paymentDetails: `Days: ${values.enCashDays}, Rate: ₹${values.dailyRate}/day, Total: ₹${totalAmount.toFixed(2)}`,
    };

    createMutation.mutate(compOffData, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "En-cash request submitted successfully",
        });
        setShowEnCashDialog(false);
        enCashForm.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to submit en-cash request",
          variant: "destructive",
        });
      },
    });
  };

  // Calculate duration for banking form
  const bankStartDate = bankForm.watch("startDate");
  const bankEndDate = bankForm.watch("endDate");
  const bankDayType = bankForm.watch("dayType");

  const getBankDurationText = () => {
    if (!bankStartDate || !bankEndDate) return "";

    const days = differenceInDays(bankEndDate, bankStartDate) + 1;
    const dayTypeText = bankDayType === "half" ? "HALF DAY" : "FULL DAY";

    if (days === 1) {
      return `Banking comp-off for ${dayTypeText} overtime work on ${format(bankStartDate, "EEE, dd MMM yyyy")}`;
    } else {
      return `Banking comp-off for ${days} ${dayTypeText.toLowerCase()}${days > 1 ? "s" : ""} overtime work from ${format(bankStartDate, "EEE, dd MMM yyyy")} to ${format(bankEndDate, "EEE, dd MMM yyyy")}`;
    }
  };

  // Calculate duration for avail form
  const availStartDate = availForm.watch("startDate");
  const availEndDate = availForm.watch("endDate");
  const availDayType = availForm.watch("dayType");

  const getAvailDurationText = () => {
    if (!availStartDate || !availEndDate) return "";

    const days = differenceInDays(availEndDate, availStartDate) + 1;
    const dayTypeText = availDayType === "half" ? "HALF DAY" : "FULL DAY";

    if (days === 1) {
      return `Taking ${dayTypeText} comp-off on ${format(availStartDate, "EEE, dd MMM yyyy")}`;
    } else {
      return `Taking ${days} ${dayTypeText.toLowerCase()}${days > 1 ? "s" : ""} comp-off from ${format(availStartDate, "EEE, dd MMM yyyy")} to ${format(availEndDate, "EEE, dd MMM yyyy")}`;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Compensatory off
          </h1>
          <div className="flex items-center space-x-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yearly">Yearly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            {/* Bank Comp-off Dialog */}
            <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      Bank Comp Off
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowBankDialog(false)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                {/* Apply on behalf checkbox */}
                {permissions?.permissions?.allowOnBehalf?.compOff === true && (
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compoff-bank-apply-on-behalf"
                        checked={applyOnBehalf}
                        onCheckedChange={(checked) =>
                          setApplyOnBehalf(!!checked)
                        }
                      />
                      <label
                        htmlFor="compoff-bank-apply-on-behalf"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Apply on behalf of someone else
                      </label>
                    </div>

                    {applyOnBehalf && (
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {externalEmployees.map((employee) => (
                            <SelectItem
                              key={employee.user_id}
                              value={employee.user_id.toString()}
                            >
                              {employee.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <Form {...bankForm}>
                  <form
                    onSubmit={bankForm.handleSubmit(onSubmitBankCompOff)}
                    className="space-y-4"
                  >
                    {/* Start Date */}
                    <FormField
                      control={bankForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overtime work start date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "mm/dd/yyyy")
                                  ) : (
                                    <span>mm/dd/yyyy</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Date */}
                    <FormField
                      control={bankForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overtime work end date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "mm/dd/yyyy")
                                  ) : (
                                    <span>mm/dd/yyyy</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Day Type Selection */}
                    <FormField
                      control={bankForm.control}
                      name="dayType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableDayTypes.map((dayType) => (
                                <SelectItem
                                  key={dayType.value}
                                  value={dayType.value}
                                >
                                  {dayType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Duration Display */}
                    {bankStartDate && bankEndDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-700">
                          {getBankDurationText()}
                        </p>
                      </div>
                    )}

                    {/* Reason */}
                    <FormField
                      control={bankForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for overtime work</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your reason for overtime work"
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBankDialog(false)}
                        className="text-teal-600 border-teal-200 hover:bg-teal-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {createMutation.isPending
                          ? "Banking..."
                          : "Bank Comp-off"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Avail Comp-off Dialog */}
            <Dialog open={showAvailDialog} onOpenChange={setShowAvailDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      Avail Comp Off
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAvailDialog(false)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                {/* Apply on behalf checkbox */}
                {permissions?.permissions?.allowOnBehalf?.compOff === true && (
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compoff-avail-apply-on-behalf"
                        checked={applyOnBehalf}
                        onCheckedChange={(checked) =>
                          setApplyOnBehalf(!!checked)
                        }
                      />
                      <label
                        htmlFor="compoff-avail-apply-on-behalf"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Apply on behalf of someone else
                      </label>
                    </div>

                    {applyOnBehalf && (
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {externalEmployees.map((employee) => (
                            <SelectItem
                              key={employee.user_id}
                              value={employee.user_id.toString()}
                            >
                              {employee.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <Form {...availForm}>
                  <form
                    onSubmit={availForm.handleSubmit(onSubmitAvailCompOff)}
                    className="space-y-4"
                  >
                    {/* Start Date */}
                    <FormField
                      control={availForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comp-off start date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "mm/dd/yyyy")
                                  ) : (
                                    <span>mm/dd/yyyy</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Date */}
                    <FormField
                      control={availForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comp-off end date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "mm/dd/yyyy")
                                  ) : (
                                    <span>mm/dd/yyyy</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Day Type Selection */}
                    <FormField
                      control={availForm.control}
                      name="dayType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select day type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableDayTypes.map((dayType) => (
                                <SelectItem
                                  key={dayType.value}
                                  value={dayType.value}
                                >
                                  {dayType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Duration Display */}
                    {availStartDate && availEndDate && (
                      <div className="bg-teal-50 border border-teal-200 rounded-md p-3">
                        <p className="text-sm text-teal-700">
                          {getAvailDurationText()}
                        </p>
                      </div>
                    )}

                    {/* Reason */}
                    <FormField
                      control={availForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for taking comp-off</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your reason for taking comp-off"
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAvailDialog(false)}
                        className="text-teal-600 border-teal-200 hover:bg-teal-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        {createMutation.isPending
                          ? "Submitting..."
                          : "Avail Comp-off"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Transfer to Leave Dialog */}
            <Dialog
              open={showTransferDialog}
              onOpenChange={setShowTransferDialog}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      Transfer to Leave
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTransferDialog(false)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                {/* Apply on behalf checkbox */}
                {permissions?.permissions?.allowOnBehalf?.compOff === true && (
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compoff-transfer-apply-on-behalf"
                        checked={applyOnBehalf}
                        onCheckedChange={(checked) =>
                          setApplyOnBehalf(!!checked)
                        }
                      />
                      <label
                        htmlFor="compoff-transfer-apply-on-behalf"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Apply on behalf of someone else
                      </label>
                    </div>

                    {applyOnBehalf && (
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {externalEmployees.map((employee) => (
                            <SelectItem
                              key={employee.user_id}
                              value={employee.user_id.toString()}
                            >
                              {employee.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <Form {...transferForm}>
                  <form
                    onSubmit={transferForm.handleSubmit(handleTransferToLeave)}
                    className="space-y-4"
                  >
                    {/* Current Balance Display */}
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                      <p className="text-sm text-orange-700">
                        Available Comp-off Balance:{" "}
                        <strong>{stats.balance} days</strong>
                      </p>
                    </div>

                    {/* Leave Type Selection */}
                    <FormField
                      control={transferForm.control}
                      name="leaveTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer to Leave Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {transferableLeaveTypes &&
                              transferableLeaveTypes.length > 0 ? (
                                transferableLeaveTypes.map((leaveType: any) => (
                                  <SelectItem
                                    key={leaveType.id}
                                    value={leaveType.id.toString()}
                                  >
                                    {leaveType.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-types" disabled>
                                  No convertible leave types configured
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Transfer Days */}
                    <FormField
                      control={transferForm.control}
                      name="transferDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days to transfer to leave</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max={stats.balance}
                              placeholder="Enter days to transfer"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Reason */}
                    <FormField
                      control={transferForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for transfer</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your reason for transferring comp-off to leave"
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTransferDialog(false)}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {createMutation.isPending
                          ? "Transferring..."
                          : "Transfer to Leave"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* En-Cash Comp Dialog */}
            <Dialog open={showEnCashDialog} onOpenChange={setShowEnCashDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      En-Cash Comp Off
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEnCashDialog(false)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                {/* Apply on behalf checkbox */}
                {permissions?.permissions?.allowOnBehalf?.compOff === true && (
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compoff-encash-apply-on-behalf"
                        checked={applyOnBehalf}
                        onCheckedChange={(checked) =>
                          setApplyOnBehalf(!!checked)
                        }
                      />
                      <label
                        htmlFor="compoff-encash-apply-on-behalf"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Apply on behalf of someone else
                      </label>
                    </div>

                    {applyOnBehalf && (
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {externalEmployees.map((employee) => (
                            <SelectItem
                              key={employee.user_id}
                              value={employee.user_id.toString()}
                            >
                              {employee.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <Form {...enCashForm}>
                  <form
                    onSubmit={enCashForm.handleSubmit(onSubmitEnCashComp)}
                    className="space-y-4"
                  >
                    {/* Current Balance Display */}
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                      <p className="text-sm text-purple-700">
                        Available Comp-off Balance:{" "}
                        <strong>{stats.balance} days</strong>
                      </p>
                    </div>

                    {/* En-Cash Days */}
                    <FormField
                      control={enCashForm.control}
                      name="enCashDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days to en-cash</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max={stats.balance}
                              placeholder="Enter days to en-cash"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Daily Rate */}
                    <FormField
                      control={enCashForm.control}
                      name="dailyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily rate (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="1"
                              placeholder="Enter daily rate for compensation"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Total Amount Display */}
                    {enCashForm.watch("enCashDays") &&
                      enCashForm.watch("dailyRate") && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <p className="text-sm text-green-700">
                            Total Amount:{" "}
                            <strong>
                              ₹
                              {(
                                enCashForm.watch("enCashDays") *
                                enCashForm.watch("dailyRate")
                              ).toFixed(2)}
                            </strong>
                          </p>
                        </div>
                      )}

                    {/* Reason */}
                    <FormField
                      control={enCashForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for en-cash</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your reason for en-cashing comp-off"
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEnCashDialog(false)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {createMutation.isPending
                          ? "Processing..."
                          : "En-Cash Comp-off"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Action Cards */}
        <div
          className={`grid gap-4 ${availableActions.length === 2 ? "grid-cols-2" : availableActions.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
        >
          {availableActions.includes("avail") && (
            <Card
              className="border border-teal-200 bg-teal-50 cursor-pointer hover:bg-teal-100 transition-colors"
              onClick={handleAvailCompOff}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-teal-700">
                      Avail Comp-off
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {availableActions.includes("bank") && (
            <Card
              className="border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={handleBankCompOff}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">
                      Bank Comp-off
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {availableActions.includes("transfer") && (
            <Card
              className="border border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={handleTransferToLeaveClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700">
                      Transfer to Leaves
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {availableActions.includes("encash") && (
            <Card
              className="border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={handleEnCashComp}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      En-Cash Comp
                    </h3>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalCompOffs}
              </div>
              <div className="text-sm text-gray-600">Total comp offs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.banked}
              </div>
              <div className="text-sm text-gray-600">Banked</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.availed}
              </div>
              <div className="text-sm text-gray-600">Availed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.pendingApprovals}
              </div>
              <div className="text-sm text-gray-600">Pending approvals</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.expired}
              </div>
              <div className="text-sm text-gray-600">Expired</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.balance}
              </div>
              <div className="text-sm text-orange-700">Balance</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.carryForward}
              </div>
              <div className="text-sm text-orange-700">Carry forward</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.enCashable}
              </div>
              <div className="text-sm text-orange-700">En-cashable</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 text-xs"
                >
                  {tab.id === "Pending" ? "1" : "0"}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worked Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        Loading comp off requests...
                      </td>
                    </tr>
                  ) : compOffRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No comp off requests found
                      </td>
                    </tr>
                  ) : (
                    compOffRecords.map((record: any) => {
                      const getTypeDisplay = (type: string) => {
                        switch (type) {
                          case "bank":
                            return "Bank";
                          case "avail":
                            return "Avail";
                          case "transfer":
                            return "Transfer";
                          case "en-cash":
                            return "En-Cash";
                          default:
                            return type || "Bank";
                        }
                      };

                      const getStatusBadge = (status: string) => {
                        const baseClasses =
                          "px-2 py-1 text-xs font-medium rounded-full";
                        switch (status) {
                          case "approved":
                            return `${baseClasses} bg-green-100 text-green-800`;
                          case "pending":
                            return `${baseClasses} bg-yellow-100 text-yellow-800`;
                          case "rejected":
                            return `${baseClasses} bg-red-100 text-red-800`;
                          default:
                            return `${baseClasses} bg-gray-100 text-gray-800`;
                        }
                      };

                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {getTypeDisplay(record.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.workedDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.type === "transfer" && record.transferAmount
                              ? `${record.transferAmount} days`
                              : record.dayType === "full"
                                ? "Full Day"
                                : "Half Day"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getStatusBadge(record.status)}>
                              {record.status?.charAt(0).toUpperCase() +
                                record.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getActionButton(record)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Comp-off Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comp-off Request Details</DialogTitle>
          </DialogHeader>
          {selectedCompOffDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Type
                  </Label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {selectedCompOffDetails.type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <p className="mt-1">
                    <Badge
                      className={
                        selectedCompOffDetails.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : selectedCompOffDetails.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {selectedCompOffDetails.status?.charAt(0).toUpperCase() +
                        selectedCompOffDetails.status?.slice(1)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Worked Date
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      selectedCompOffDetails.workedDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Day Type
                  </Label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {selectedCompOffDetails.dayType === "full"
                      ? "Full Day"
                      : selectedCompOffDetails.dayType === "half"
                        ? "Half Day"
                        : selectedCompOffDetails.dayType === "quarter"
                          ? "Quarter Day"
                          : selectedCompOffDetails.dayType}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Reason
                </Label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedCompOffDetails.reason}
                </p>
              </div>

              {selectedCompOffDetails.type === "transfer" &&
                selectedCompOffDetails.transferAmount && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Transfer Amount
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCompOffDetails.transferAmount} days
                    </p>
                  </div>
                )}

              {selectedCompOffDetails.type === "en-cash" &&
                selectedCompOffDetails.enCashAmount && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      En-cash Amount
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCompOffDetails.enCashAmount} days
                    </p>
                  </div>
                )}

              {selectedCompOffDetails.compensateWith && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Compensate Date
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      selectedCompOffDetails.compensateWith,
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Applied At
                </Label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedCompOffDetails.appliedAt).toLocaleString()}
                </p>
              </div>

              {selectedCompOffDetails.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium text-red-500">
                    Rejection Reason
                  </Label>
                  <p className="mt-1 text-sm text-red-700">
                    {selectedCompOffDetails.rejectionReason}
                  </p>
                </div>
              )}

              {selectedCompOffDetails.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Notes
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedCompOffDetails.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

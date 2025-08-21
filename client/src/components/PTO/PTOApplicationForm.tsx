import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarIcon, Upload, X, Clock, FileText, AlertTriangle } from "lucide-react";
import { format, addDays, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWorkPattern } from "@/hooks/useWorkPattern";

// Helper function to check if date is a holiday
const isHolidayDate = (date: Date, holidays: any[]) => {
  const dateString = format(date, 'yyyy-MM-dd');
  return holidays.some((holiday: any) => {
    const holidayDate = new Date(holiday.selectedDate || holiday.date);
    return format(holidayDate, 'yyyy-MM-dd') === dateString;
  });
};

// Helper function to calculate working days (similar to LeaveApplications.tsx)
const calculateWorkingDays = (startDate: Date, endDate: Date, holidays: any[]) => {
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

// BTO Application form schema
const btoApplicationSchema = z.object({
  btoVariantId: z.number().min(1, "Please select a BTO variant"),
  requestDate: z.date({
    required_error: "Request date is required",
  }),
  timeType: z.string().min(1, "Please select time type"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalHours: z.number().optional(),
  reason: z.string().min(1, "Reason is required"),
  documentUrl: z.string().optional(),
});

type BTOApplicationForm = z.infer<typeof btoApplicationSchema>;

interface BTOApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  employees?: any[];
  permissions?: any;
}

export default function BTOApplicationForm({ 
  open, 
  onOpenChange, 
  onSuccess, 
  employees = [],
  permissions
}: BTOApplicationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [applyOnBehalf, setApplyOnBehalf] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // Reset apply on behalf state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setApplyOnBehalf(false);
      setSelectedEmployeeId("");
    }
  }, [open]);

  // Get current user ID from localStorage or use selected employee ID for on-behalf
  const currentUserId = applyOnBehalf && selectedEmployeeId ? selectedEmployeeId : (localStorage.getItem('user_id') || '225');

  // Get work pattern and filtered holidays for current user
  const { workPattern, isLoading: workPatternLoading } = useWorkPattern();

  // Fetch holidays from internal database API
  const { data: allHolidays = [] } = useQuery({
    queryKey: ['/api/holidays'],
    queryFn: async () => {
      const response = await fetch('/api/holidays', {
        credentials: 'include',
        headers: {
          'X-Org-Id': localStorage.getItem('org_id') || '13'
        }
      });
      return response.ok ? response.json() : [];
    },
    enabled: open,
  });

  // Filter holidays based on user's work pattern
  const filteredHolidays = workPattern && workPattern.selectedHolidays 
    ? allHolidays.filter((holiday: any) => workPattern.selectedHolidays.includes(holiday.id))
    : allHolidays; // Show all holidays if work pattern isn't available

  console.log('🎯 BTO Form Holiday Filtering:', {
    workPattern: workPattern?.patternName,
    selectedHolidayIds: workPattern?.selectedHolidays,
    allHolidays: allHolidays.length,
    filteredHolidays: filteredHolidays.length
  });

  // Fetch BTO variants available to current user
  const { data: btoVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ['/api/pto-variants/user', currentUserId],
    queryFn: async () => {
      console.log("BTO Form - Fetching variants for user:", currentUserId);

      // First get all BTO variants  
      const orgId = localStorage.getItem('org_id') || '13';
      console.log("BTO Form - Using org_id:", orgId);

      const variants = await fetch('/api/pto-variants', {
        credentials: 'include',
        headers: {
          'X-Org-Id': orgId
        }
      }).then(res => res.json());

      console.log("BTO Form - All variants:", variants);

      // Filter variants assigned to current user
      const userVariants = [];
      let hasAnyAssignments = false;

      for (const variant of variants) {
        try {
          const assignmentsResponse = await fetch(`/api/employee-assignments/pto/${variant.id}`, {
            credentials: 'include',
            headers: {
              'X-Org-Id': orgId
            }
          });
          if (assignmentsResponse.ok) {
            const assignments = await assignmentsResponse.json();
            console.log(`BTO Form - Assignments for variant ${variant.id}:`, assignments);

            if (assignments.length > 0) {
              hasAnyAssignments = true;
              const isAssigned = assignments.some((assignment: any) => 
                assignment.userId === currentUserId || assignment.userId === currentUserId.toString()
              );

              console.log(`BTO Form - User ${currentUserId} assigned to variant ${variant.id}:`, isAssigned);

              if (isAssigned) {
                userVariants.push(variant);
              }
            }
          }
        } catch (error) {
          console.error(`Error checking assignments for variant ${variant.id}:`, error);
        }
      }

      // If no assignments exist for any variant, show all variants (for testing/initial setup)
      if (!hasAnyAssignments && variants.length > 0) {
        console.log("BTO Form - No assignments found for any variant, showing all variants for testing");
        return variants;
      }

      console.log("BTO Form - Final user variants:", userVariants);
      return userVariants;
    },
    enabled: open,
  });

  // Fetch user's existing BTO requests for validation
  const { data: existingRequests = [] } = useQuery({
    queryKey: ['/api/pto-requests', currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/pto-requests?userId=${currentUserId}`, {
        credentials: 'include',
        headers: {
          'X-Org-Id': localStorage.getItem('org_id') || '13'
        }
      });
      return response.ok ? response.json() : [];
    },
    enabled: open,
  });

  // Form setup
  const form = useForm<BTOApplicationForm>({
    resolver: zodResolver(btoApplicationSchema),
    defaultValues: {
      reason: "",
      timeType: "",
    },
  });

  const watchedVariantId = form.watch("btoVariantId");
  const watchedTimeType = form.watch("timeType");
  const watchedRequestDate = form.watch("requestDate");

  // Update selected variant when form changes
  useEffect(() => {
    if (watchedVariantId) {
      const variant = btoVariants.find(v => v.id === watchedVariantId);
      console.log("BTO Form - Selected variant:", variant);
      setSelectedVariant(variant);

      // Reset time unit when variant changes
      form.setValue("timeType", "");
      form.setValue("startTime", "");
      form.setValue("endTime", "");
      form.setValue("totalHours", undefined);
    } else {
      setSelectedVariant(null);
    }
  }, [watchedVariantId, btoVariants]);

  // Validate request based on variant rules and existing requests
  useEffect(() => {
    if (!selectedVariant || !watchedRequestDate) {
      setValidationErrors([]);
      return;
    }

    const errors: string[] = [];
    const requestDate = new Date(watchedRequestDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if request date falls on a holiday (based on user's work pattern)
    const requestDateString = format(requestDate, 'yyyy-MM-dd');
    const isHoliday = filteredHolidays.some((holiday: any) => {
      const holidayDate = new Date(holiday.selectedDate || holiday.date);
      return format(holidayDate, 'yyyy-MM-dd') === requestDateString;
    });

    if (isHoliday) {
      const holidayName = filteredHolidays.find((holiday: any) => {
        const holidayDate = new Date(holiday.selectedDate || holiday.date);
        return format(holidayDate, 'yyyy-MM-dd') === requestDateString;
      })?.holidayName || 'holiday';
      errors.push(`Cannot apply for BTO on ${holidayName}. Please select a different date.`);
    }

    // Check advance notice requirement
    if (selectedVariant.approvalDays > 0) {
      const requiredDate = addDays(today, selectedVariant.approvalDays);
      if (isBefore(requestDate, requiredDate)) {
        errors.push(`Request must be made at least ${selectedVariant.approvalDays} days in advance`);
      }
    }

    // Check maximum instances per period
    if (selectedVariant.maxInstances > 0 && existingRequests.length > 0) {
      const currentMonth = requestDate.getMonth();
      const currentYear = requestDate.getFullYear();
      const currentQuarter = Math.floor(currentMonth / 3);

      let periodRequests = existingRequests.filter((req: any) => {
        const reqDate = new Date(req.requestDate);
        if (selectedVariant.maxInstancesPeriod === "Month") {
          return reqDate.getMonth() === currentMonth && reqDate.getFullYear() === currentYear;
        } else if (selectedVariant.maxInstancesPeriod === "Quarter") {
          const reqQuarter = Math.floor(reqDate.getMonth() / 3);
          return reqQuarter === currentQuarter && reqDate.getFullYear() === currentYear;
        } else { // Year
          return reqDate.getFullYear() === currentYear;
        }
      });

      if (periodRequests.length >= selectedVariant.maxInstances) {
        errors.push(`Maximum ${selectedVariant.maxInstances} instances per ${selectedVariant.maxInstancesPeriod.toLowerCase()} exceeded`);
      }
    }

    setValidationErrors(errors);
  }, [selectedVariant, watchedRequestDate, existingRequests, filteredHolidays]);

  // Calculate total hours for hour-based BTO
  const calculateHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end <= start) return 0;

    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  };

  // Update total hours when times change
  useEffect(() => {
    if (watchedTimeType === "hours") {
      const startTime = form.watch("startTime");
      const endTime = form.watch("endTime");
      if (startTime && endTime) {
        const hours = calculateHours(startTime, endTime);
        form.setValue("totalHours", hours);
      }
    }
  }, [form.watch("startTime"), form.watch("endTime"), watchedTimeType]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/pto-requests", data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pto-requests'] });
      const message = response.workflowId 
        ? "BTO request submitted and sent for approval"
        : "BTO request submitted and approved automatically";
      toast({
        title: "Success",
        description: message,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit BTO request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BTOApplicationForm) => {
    // Validate apply on behalf selection
    if (applyOnBehalf && !selectedEmployeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee to apply on behalf of",
        variant: "destructive",
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before submitting",
        variant: "destructive",
      });
      return;
    }

    // Calculate working days for BTO request
    let workingDays = 1; // Default for single day BTO

    // For date range BTO (future enhancement if needed)
    if (data.requestDate) {
      workingDays = calculateWorkingDays(data.requestDate, data.requestDate, filteredHolidays);

      // Use dynamic holiday validation for BTO requests
      const requestDateStr = format(data.requestDate, "yyyy-MM-dd");
      console.log('✅ Using dynamic working days calculation for BTO:', workingDays);

      console.log('BTO Working Days Calculation:', {
        requestDate: requestDateStr,
        calculatedWorkingDays: workingDays
      });
    }

    // Additional validation for hours-based BTO
    if (data.timeType === "hours") {
      if (!data.startTime || !data.endTime || !data.totalHours) {
        toast({
          title: "Validation Error", 
          description: "Start time, end time, and total hours are required for hour-based BTO",
          variant: "destructive",
        });
        return;
      }

      if (selectedVariant?.minimumHours && data.totalHours < selectedVariant.minimumHours) {
        toast({
          title: "Validation Error",
          description: `Minimum ${selectedVariant.minimumHours} hours required`,
          variant: "destructive",
        });
        return;
      }

      if (selectedVariant?.maxHours && data.totalHours > selectedVariant.maxHours) {
        toast({
          title: "Validation Error", 
          description: `Maximum ${selectedVariant.maxHours} hours allowed`,
          variant: "destructive",
        });
        return;
      }
    }

    // Add user_id and working days to the request data
    const requestData = {
      ...data,
      userId: currentUserId,
      ptoVariantId: parseInt(data.btoVariantId.toString()),
      workingDays // Add working days calculation
    };

    console.log("BTO Form - Submitting request:", requestData);
    submitMutation.mutate(requestData);
  };

  const getAvailableTimeTypes = () => {
    if (!selectedVariant) return [];

    console.log("BTO Form - Selected variant time options:", {
      halfDay: selectedVariant.halfDay,
      quarterDay: selectedVariant.quarterDay,
      hours: selectedVariant.hours
    });

    const types = [];

    // BTO units are specific - only add enabled options from variant
    if (selectedVariant.halfDay) {
      types.push({ value: "half_day", label: "Half Day" });
    }

    if (selectedVariant.quarterDay) {
      types.push({ value: "quarter_day", label: "Quarter Day" });
    }

    if (selectedVariant.hours) {
      types.push({ value: "hours", label: "Hours" });
    }

    console.log("BTO Form - Available BTO time types:", types);
    return types;
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Apply for BTO
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Validation Errors</h4>
                      <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Apply on behalf section - Only show for users with permission */}
            {permissions?.permissions?.allowOnBehalf?.bto && (
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bto-apply-on-behalf"
                    checked={applyOnBehalf}
                    onCheckedChange={(checked) => {
                      setApplyOnBehalf(!!checked);
                      if (!checked) {
                        setSelectedEmployeeId("");
                      }
                    }}
                  />
                  <label 
                    htmlFor="bto-apply-on-behalf" 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Apply on behalf of someone else
                  </label>
                </div>

                {applyOnBehalf && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Employee</label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees && employees.length > 0 ? (
                          employees
                            .filter(employee => employee?.user_id)
                            .map((employee) => (
                              <SelectItem key={employee.user_id} value={employee.user_id.toString()}>
                                {employee.user_name || `Employee ${employee.user_id}`}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-employees" disabled>No employees available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {applyOnBehalf && !selectedEmployeeId && (
                      <p className="text-sm text-red-600">Please select an employee to apply on behalf of</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BTO Variant Selection */}
            <FormField
              control={form.control}
              name="btoVariantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BTO Type</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BTO type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {variantsLoading ? (
                        <SelectItem value="loading" disabled>Loading BTO types...</SelectItem>
                      ) : btoVariants.length === 0 ? (
                        <SelectItem value="none" disabled>No BTO types available</SelectItem>
                      ) : (
                        btoVariants.map((variant: any) => (
                          <SelectItem key={variant.id} value={variant.id.toString()}>
                            {variant.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedVariant && (
                    <p className="text-sm text-gray-600">{selectedVariant.description}</p>
                  )}
                </FormItem>
              )}
            />

            {/* Request Date */}
            <FormField
              control={form.control}
              name="requestDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return isBefore(date, today);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Unit */}
            {selectedVariant && (
              <FormField
                control={form.control}
                name="timeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableTimeTypes().length === 0 ? (
                          <SelectItem value="none" disabled>No time units available for this BTO type</SelectItem>
                        ) : (
                          getAvailableTimeTypes().map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Hours Configuration */}
            {watchedTimeType === "hours" && (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-48">
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={`start-${time.value}`} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="End" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-48">
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={`end-${time.value}`} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max={selectedVariant?.maxHours || 24}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          placeholder="0.0"
                          readOnly
                          className="bg-gray-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Hours Validation Info */}
            {watchedTimeType === "hours" && selectedVariant && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm text-blue-800">
                    <strong>Hours Requirements:</strong>
                    {selectedVariant.minimumHours > 0 && (
                      <span className="block">• Minimum: {selectedVariant.minimumHours} hours</span>
                    )}
                    {selectedVariant.maxHours > 0 && (
                      <span className="block">• Maximum: {selectedVariant.maxHours} hours</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide a reason for your BTO request..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Upload */}
            {selectedVariant?.documentsRequired && (
              <FormField
                control={form.control}
                name="documentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Supporting Document (Required)
                    </FormLabel>
                    <FormControl>
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Upload a supporting document</p>
                            <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="mt-2"
                            onChange={(e) => {
                              // In a real implementation, upload file and set URL
                              if (e.target.files?.[0]) {
                                field.onChange(`/uploads/${e.target.files[0].name}`);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending || validationErrors.length > 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { DancingLoader } from "@/components/ui/dancing-loader";
import { Users } from "lucide-react";
import EmployeeAssignment from "./EmployeeAssignment";
import { fetchEmployeeData, transformEmployeeData } from "@/lib/externalApi";

interface PTOVariantFormProps {
  variant?: any;
  onClose: () => void;
}

export default function PTOVariantForm({
  variant,
  onClose,
}: PTOVariantFormProps) {
  const { toast } = useToast();
  const isEditing = !!variant;
  const [showEmployeeAssignment, setShowEmployeeAssignment] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);

  // Form state
  const [halfDay, setHalfDay] = useState(variant?.halfDay || false);
  const [quarterDay, setQuarterDay] = useState(variant?.quarterDay || false);
  const [hours, setHours] = useState(variant?.hours || false);
  const [workflowRequired, setWorkflowRequired] = useState(
    variant?.workflowRequired || false,
  );
  const [noticePeriodAllowed, setNoticePeriodAllowed] = useState(
    variant?.noticePeriodAllowed || true,
  );
  const [documentsRequired, setDocumentsRequired] = useState(
    variant?.documentsRequired || false,
  );
  const [lossOfPay, setLossOfPay] = useState(variant?.lossOfPay || true);
  const [deductHalfDay, setDeductHalfDay] = useState(
    variant?.deductHalfDay || false,
  );
  const [deductQuarterDay, setDeductQuarterDay] = useState(
    variant?.deductQuarterDay || false,
  );
  const [deductHours, setDeductHours] = useState(variant?.deductHours || false);
  const [applicableAfterType, setApplicableAfterType] = useState(
    variant?.applicableAfterType || "date_of_joining",
  );
  const [withdrawalBeforeApproval, setWithdrawalBeforeApproval] = useState(
    variant?.withdrawalBeforeApproval !== false,
  );
  const [withdrawalAfterApproval, setWithdrawalAfterApproval] = useState(
    variant?.withdrawalAfterApproval || false,
  );
  const [withdrawalNotAllowed, setWithdrawalNotAllowed] = useState(
    variant?.withdrawalNotAllowed || false,
  );
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [documentDescription, setDocumentDescription] = useState(
    variant?.documentDescription || "",
  );

  // Withdrawal settings logic - mutual exclusivity
  const handleWithdrawalBeforeApprovalChange = (checked: boolean) => {
    setWithdrawalBeforeApproval(checked);
    if (checked && withdrawalNotAllowed) {
      setWithdrawalNotAllowed(false);
    }
  };

  const handleWithdrawalAfterApprovalChange = (checked: boolean) => {
    setWithdrawalAfterApproval(checked);
    if (checked && withdrawalNotAllowed) {
      setWithdrawalNotAllowed(false);
    }
  };

  const handleWithdrawalNotAllowedChange = (checked: boolean) => {
    setWithdrawalNotAllowed(checked);
    if (checked) {
      setWithdrawalBeforeApproval(false);
      setWithdrawalAfterApproval(false);
    }
  };

  // Fetch existing employee assignments for this variant using PTO-specific endpoint
  const { data: existingAssignments = [] } = useQuery({
    queryKey: [`/api/employee-assignments/pto/${variant?.id}`],
    enabled: !!variant?.id,
    staleTime: Infinity, // Never refetch automatically
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // Employee data will be fetched from external API
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Fetch active leave types for deduction selection
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  }) as { data: any[] };

  // Load employee data from external API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeeData = await fetchEmployeeData();
        const transformedEmployees = employeeData.map(transformEmployeeData);
        setAllEmployees(transformedEmployees);
        console.log(
          "PTO Edit - External API loaded",
          transformedEmployees.length,
          "employees",
        );
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    loadEmployees();
  }, []);

  // Enhance assigned employees with external API data when it becomes available
  useEffect(() => {
    if (allEmployees.length > 0 && assignedEmployees.length > 0) {
      // Check if current assigned employees are just fallback data
      const isUsingFallbackData = assignedEmployees.every(
        (emp) =>
          emp.user_name?.startsWith("Employee ") &&
          emp.firstName === "Employee",
      );

      if (isUsingFallbackData) {
        console.log(
          "PTO Edit - Enhancing fallback data with external API data",
        );
        const assignedUserIds = assignedEmployees.map(
          (emp) => emp.user_id || emp.id,
        );
        const enhancedEmployees = allEmployees.filter((emp) => {
          const userIdMatch = assignedUserIds.includes(emp.user_id);
          const idMatch = assignedUserIds.includes(emp.id);
          return userIdMatch || idMatch;
        });

        if (enhancedEmployees.length > 0) {
          console.log(
            "PTO Edit - Enhanced",
            enhancedEmployees.length,
            "employees with API data",
          );
          setAssignedEmployees(enhancedEmployees);
        }
      }
    }
  }, [allEmployees, assignedEmployees]);

  // Load assigned employees when variant changes or assignments are fetched
  useEffect(() => {
    if (!Array.isArray(existingAssignments)) {
      return; // Still loading assignments
    }

    console.log(
      "PTO Edit - Processing assignments:",
      existingAssignments.length,
      "assignments",
    );
    console.log(
      "PTO Edit - All employees loaded:",
      allEmployees.length,
      "employees",
    );

    if (existingAssignments.length === 0) {
      // No assignments exist
      console.log(
        "PTO Edit - No assignments found, clearing assigned employees",
      );
      setAssignedEmployees([]);
      return;
    }

    // Create fallback employees immediately to preserve assignments
    const assignedUserIds = existingAssignments.map(
      (assignment: any) => assignment.userId,
    );
    const fallbackEmployees = existingAssignments.map((assignment: any) => ({
      user_id: assignment.userId,
      id: assignment.userId,
      user_name: `Employee ${assignment.userId}`,
      name: `Employee ${assignment.userId}`,
      firstName: "Employee",
      lastName: assignment.userId,
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
    }));

    if (allEmployees.length > 0) {
      // Try to match with external API employee data if available
      const assignedEmployeeData = allEmployees.filter((emp) => {
        const userIdMatch = assignedUserIds.includes(emp.user_id);
        const idMatch = assignedUserIds.includes(emp.id);
        return userIdMatch || idMatch;
      });

      if (assignedEmployeeData.length > 0) {
        console.log(
          "PTO Edit - Matched",
          assignedEmployeeData.length,
          "employees from external API",
        );
        setAssignedEmployees(assignedEmployeeData);
      } else {
        console.log(
          "PTO Edit - No matches found in external API, using fallback employees",
        );
        setAssignedEmployees(fallbackEmployees);
      }
    } else {
      // External API not loaded yet, use fallback to preserve assignments
      console.log(
        "PTO Edit - External API not loaded, using fallback employees to preserve assignments",
      );
      setAssignedEmployees(fallbackEmployees);
    }
  }, [existingAssignments, variant?.id]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      leaveVariantName: variant?.leaveVariantName || variant?.name || "",
      description: variant?.description || "",
      applicableAfter: variant?.applicableAfter || 0,
      approvalDays: variant?.approvalDays || 0,
      minimumHours: variant?.minimumHours || 0,
      maxHours: variant?.maxHours || 0,
      maxInstances: variant?.maxInstances || 0,
      maxInstancesPeriod: variant?.maxInstancesPeriod || "Month",
      documentDescription: variant?.documentDescription || "",
      grantingPeriod: variant?.grantingPeriod || "Yearly",
    },
  });

  // Add useEffect to update state when variant changes
  useEffect(() => {
    if (variant) {
      console.log("PTO Form - Loading variant data:", variant);
      setHalfDay(variant.halfDay || false);
      setQuarterDay(variant.quarterDay || false);
      setHours(variant.hours || false);
      setWorkflowRequired(variant.workflowRequired || false);
      setNoticePeriodAllowed(variant.noticePeriodAllowed !== false);
      setDocumentsRequired(variant.documentsRequired || false);
      setLossOfPay(variant.lossOfPay !== false);
      setDeductHalfDay(variant.deductHalfDay || false);
      setDeductQuarterDay(variant.deductQuarterDay || false);
      setDeductHours(variant.deductHours || false);
      setApplicableAfterType(variant.applicableAfterType || "date_of_joining");
      setWithdrawalBeforeApproval(variant.withdrawalBeforeApproval !== false);
      setWithdrawalAfterApproval(variant.withdrawalAfterApproval || false);
      setWithdrawalNotAllowed(variant.withdrawalNotAllowed || false);
      setSelectedLeaveTypes(variant.deductibleLeaveTypes || []);
      setDocumentDescription(variant.documentDescription || "");

      // Reset form values
      reset({
        leaveVariantName: variant.name || "",
        description: variant.description || "",
        applicableAfter: variant.applicableAfter || 0,
        approvalDays: variant.approvalDays || 0,
        minimumHours: variant.minimumHours || 0,
        maxHours: variant.maxHours || 0,
        maxInstances: variant.maxInstances || 0,
        maxInstancesPeriod: variant.maxInstancesPeriod || "Month",
        documentDescription: variant.documentDescription || "",
        grantingPeriod: variant.grantingPeriod || "Yearly",
      });

      console.log(
        "PTO Form - Loaded applicableAfterType:",
        variant.applicableAfterType || "date_of_joining",
      );
    }
  }, [variant, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.leaveVariantName,
        description: data.description,
        enabled: true,
        halfDay,
        quarterDay,
        hours,
        workflowRequired: workflowRequired,
        documentsRequired: documentsRequired,
        noticePeriodAllowed,
        applicableAfterType,
        applicableAfter: data.applicableAfter || 0,
        approvalDays: data.approvalDays || 0,
        minimumHours: data.minimumHours || 0,
        maxHours: data.maxHours || 0,
        maxInstances: data.maxInstances || 0,
        maxInstancesPeriod: data.maxInstancesPeriod || "Month",
        grantingPeriod: data.grantingPeriod || "Yearly",
        lossOfPay,
        deductHalfDay,
        deductQuarterDay,
        deductHours,
        withdrawalBeforeApproval,
        withdrawalAfterApproval,
        withdrawalNotAllowed,
        deductibleLeaveTypes: selectedLeaveTypes,
        documentDescription,
      };

      console.log("PTO Variant Form - Submission payload:", payload);

      const result = isEditing
        ? await apiRequest("PATCH", `/api/pto-variants/${variant.id}`, payload)
        : await apiRequest("POST", "/api/pto-variants", payload);

      // If creating a new variant and there are assigned employees, create assignments
      if (!isEditing && assignedEmployees.length > 0 && (result as any)?.id) {
        const assignments = assignedEmployees.map((emp) => ({
          userId: emp.user_id || emp.id, // Support both user_id and id fields
          leaveVariantId: (result as any).id,
          assignmentType: "pto_variant",
        }));
        console.log("PTO new variant assignment payload:", assignments);

        await apiRequest("POST", "/api/employee-assignments/bulk", {
          assignments,
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pto-variants"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/employee-assignments"],
      });
      toast({
        title: "Success",
        description: `PTO variant ${isEditing ? "updated" : "created"} successfully.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} PTO variant.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Validate required fields
    if (!data.leaveVariantName?.trim()) {
      toast({
        title: "Validation Error",
        description: "PTO Variant Name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!data.description?.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }

    // Document description validation
    if (documentsRequired && !documentDescription.trim()) {
      toast({
        title: "Validation Error",
        description:
          "Document description is required when supporting documents are required.",
        variant: "destructive",
      });
      return;
    }

    // Include PTO units state in submission data and fix field mapping
    const submissionData = {
      ...data,
      name: data.leaveVariantName, // Map to correct field name
      halfDay,
      quarterDay,
      hours,
      workflowRequired,
      noticePeriodAllowed,
      documentsRequired,
      lossOfPay,
      deductHalfDay,
      deductQuarterDay,
      deductHours,
    };

    createMutation.mutate(submissionData);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
      {/* Loading Overlay */}
      {createMutation.isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <DancingLoader
            size="lg"
            text={
              isEditing ? "Updating PTO variant..." : "Creating PTO variant..."
            }
          />
        </div>
      )}

      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? "Edit PTO Variant" : "New PTO Variant"}
          </h2>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            Go Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="space-y-8">
          {/* PTO units allowed */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                PTO units allowed
              </h3>
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="halfDay"
                    className="rounded"
                    checked={halfDay}
                    onChange={(e) => setHalfDay(e.target.checked)}
                  />
                  <label htmlFor="halfDay" className="text-sm font-medium">
                    Half Day
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="quarterDay"
                    className="rounded"
                    checked={quarterDay}
                    onChange={(e) => setQuarterDay(e.target.checked)}
                  />
                  <label htmlFor="quarterDay" className="text-sm font-medium">
                    Quarter Day
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hours"
                    className="rounded"
                    checked={hours}
                    onChange={(e) => setHours(e.target.checked)}
                  />
                  <label htmlFor="hours" className="text-sm font-medium">
                    Hours
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PTO Variant Name and Description */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                PTO Variant Name <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Create tailored PTO policies for specific groups of employees
                using variants
              </p>
              <input
                {...register("leaveVariantName", {
                  required: "PTO variant name is required",
                })}
                type="text"
                placeholder="eg. For Factory Employees"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.leaveVariantName ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.leaveVariantName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.leaveVariantName.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                })}
                placeholder="eg. Need time off for personal errands? Use PTO."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] ${
                  errors.description ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.description.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Eligibility Criteria */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Eligibility Criteria
              </h3>
              <div className="space-y-6">
                {/* Applicable after */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Applicable after
                  </h4>

                  {/* Option 1: Probation Period Ends */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="probation_end"
                      name="applicableAfterType"
                      value="probation_end"
                      checked={applicableAfterType === "probation_end"}
                      onChange={() => setApplicableAfterType("probation_end")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="probation_end" className="text-sm">
                      Probation period ends
                    </label>
                  </div>

                  {/* Option 2: On Date of Joining */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="date_of_joining"
                      name="applicableAfterType"
                      value="date_of_joining"
                      checked={applicableAfterType === "date_of_joining"}
                      onChange={() => setApplicableAfterType("date_of_joining")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="date_of_joining" className="text-sm">
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
                      checked={applicableAfterType === "days"}
                      onChange={() => setApplicableAfterType("days")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="days" className="text-sm">
                      Specified number of days:
                    </label>
                    <input
                      {...register("applicableAfter", { valueAsNumber: true })}
                      type="number"
                      className="w-20 text-center px-2 py-1 border border-gray-300 rounded"
                      min="0"
                      disabled={applicableAfterType !== "days"}
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">
                      (days) from date of joining
                    </span>
                  </div>
                </div>

                {/* Workflow requirement */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-700">
                    Does this require a review workflow for approval?
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setWorkflowRequired(true)}
                      className={
                        workflowRequired
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      Workflow
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setWorkflowRequired(false)}
                      className={
                        !workflowRequired
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      No Workflow
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    If leave you select 'No workflow' then PTO will be
                    auto-approved and leave balance will be deducted
                    immediately.
                  </p>
                </div>

                {/* Withdrawal of application allowed */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">
                    Withdrawal of application allowed
                  </span>
                  {workflowRequired ? (
                    // When workflow is required, show detailed options
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={withdrawalBeforeApproval}
                          onChange={(e) =>
                            handleWithdrawalBeforeApprovalChange(
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Before approval
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={withdrawalAfterApproval}
                          onChange={(e) =>
                            handleWithdrawalAfterApprovalChange(
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          After approval
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={withdrawalNotAllowed}
                          onChange={(e) =>
                            handleWithdrawalNotAllowedChange(e.target.checked)
                          }
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Not allowed
                        </span>
                      </label>
                    </div>
                  ) : (
                    // When no workflow, show simplified options
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={!withdrawalNotAllowed}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWithdrawalNotAllowed(false);
                              setWithdrawalBeforeApproval(true);
                            } else {
                              setWithdrawalNotAllowed(true);
                              setWithdrawalBeforeApproval(false);
                              setWithdrawalAfterApproval(false);
                            }
                          }}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Allowed</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={withdrawalNotAllowed}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWithdrawalNotAllowed(true);
                              setWithdrawalBeforeApproval(false);
                              setWithdrawalAfterApproval(false);
                            } else {
                              setWithdrawalNotAllowed(false);
                              setWithdrawalBeforeApproval(true);
                            }
                          }}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Not allowed
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Approval advance notice */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Approval request should be made
                  </span>
                  <input
                    {...register("approvalDays", { valueAsNumber: true })}
                    type="number"
                    className="w-20 text-center px-2 py-1 border border-gray-300 rounded"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">(days)</span>
                  <span className="text-sm text-gray-700">in advance</span>
                </div>

                {/* Minimum hours */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Minimum hours required
                  </span>
                  <input
                    {...register("minimumHours", { valueAsNumber: true })}
                    type="number"
                    className="w-20 text-center px-2 py-1 border border-gray-300 rounded"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">(hours)</span>
                </div>

                {/* Max hours */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Max hours allowed
                  </span>
                  <input
                    {...register("maxHours", { valueAsNumber: true })}
                    type="number"
                    className="w-20 text-center px-2 py-1 border border-gray-300 rounded"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">(hours)</span>
                </div>

                {/* Max instances */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">Max instances</span>
                    <input
                      {...register("maxInstances", { valueAsNumber: true })}
                      type="number"
                      className="w-20 text-center px-2 py-1 border border-gray-300 rounded"
                      min="0"
                    />
                    <span className="text-sm text-gray-500">(days)</span>
                    <span className="text-sm text-gray-700">in a</span>
                    <select
                      {...register("maxInstancesPeriod")}
                      className="px-3 py-1 border border-gray-300 rounded"
                    >
                      <option value="Month">Month</option>
                      <option value="Quarter">Quarter</option>
                      <option value="Year">Year</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    If the value is 0, it is understood that there is no limit.
                  </p>
                </div>

                {/* Notice period */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-700">
                    During notice period, PTO is
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setNoticePeriodAllowed(true)}
                      className={
                        noticePeriodAllowed
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      Allowed
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setNoticePeriodAllowed(false)}
                      className={
                        !noticePeriodAllowed
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      Not Allowed
                    </Button>
                  </div>
                </div>

                {/* Supporting documents */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-700">
                    Supporting documents are
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDocumentsRequired(true)}
                      className={
                        documentsRequired
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      Required
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDocumentsRequired(false)}
                      className={
                        !documentsRequired
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }
                    >
                      Not Required
                    </Button>
                  </div>
                  {documentsRequired && (
                    <>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-700">
                          Document Description{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={documentDescription}
                          onChange={(e) =>
                            setDocumentDescription(e.target.value)
                          }
                          placeholder="Enter the details of the documents to be added. This message will be displayed to your employees while uploading documents."
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] ${
                            documentsRequired && !documentDescription.trim()
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        {documentsRequired && !documentDescription.trim() && (
                          <p className="text-xs text-red-500">
                            Description is required when supporting documents
                            are required.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* If max instances crossed */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm text-gray-700">
                      If Max. PTO instances/ hours are crossed
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setLossOfPay(true)}
                        className={
                          lossOfPay
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }
                      >
                        Loss of Pay
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setLossOfPay(false)}
                        className={
                          !lossOfPay
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }
                      >
                        Deduct from Leave Balance
                      </Button>
                    </div>
                  </div>

                  {lossOfPay && (
                    <div className="space-y-2">
                      <span className="text-sm text-gray-700">
                        Deduct Pay for
                      </span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="deductHalfDay"
                            className="rounded"
                            checked={deductHalfDay}
                            onChange={(e) => setDeductHalfDay(e.target.checked)}
                          />
                          <label htmlFor="deductHalfDay" className="text-sm">
                            Half Day
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="deductQuarterDay"
                            className="rounded"
                            checked={deductQuarterDay}
                            onChange={(e) =>
                              setDeductQuarterDay(e.target.checked)
                            }
                          />
                          <label htmlFor="deductQuarterDay" className="text-sm">
                            Quarter Day
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="deductHours"
                            className="rounded"
                            checked={deductHours}
                            onChange={(e) => setDeductHours(e.target.checked)}
                          />
                          <label htmlFor="deductHours" className="text-sm">
                            Hours
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {!lossOfPay && (
                    <div className="space-y-2">
                      <span className="text-sm text-gray-700">
                        Select leave types to deduct from:
                      </span>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                        {leaveTypes
                          .filter((type: any) => type.enabled !== false)
                          .map((leaveType: any) => (
                            <label
                              key={leaveType.id}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLeaveTypes.includes(
                                  leaveType.id.toString(),
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeaveTypes([
                                      ...selectedLeaveTypes,
                                      leaveType.id.toString(),
                                    ]);
                                  } else {
                                    setSelectedLeaveTypes(
                                      selectedLeaveTypes.filter(
                                        (id) => id !== leaveType.id.toString(),
                                      ),
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">
                                {leaveType.name}
                              </span>
                            </label>
                          ))}
                      </div>
                      {selectedLeaveTypes.length === 0 && (
                        <p className="text-xs text-red-500">
                          Please select at least one leave type for deduction.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      PTO will be granted
                    </span>
                    <select
                      {...register("grantingPeriod")}
                      className="px-3 py-1 border border-gray-300 rounded"
                    >
                      <option value="Yearly">Yearly</option>
                      <option value="Half yearly">Half yearly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign to Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Assign to Employees</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("Assign Employees button clicked!");
                  setShowEmployeeAssignment(true);
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Users className="w-4 h-4 mr-2" />
                {assignedEmployees.length > 0
                  ? "Edit Assignment"
                  : "Assign Employees"}
              </Button>
            </CardHeader>
            {assignedEmployees.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {assignedEmployees.length} employee
                    {assignedEmployees.length > 1 ? "s" : ""} assigned
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {assignedEmployees.slice(0, 3).map((employee, index) => (
                      <div
                        key={employee.user_id}
                        className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1"
                      >
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {(
                              employee.user_name ||
                              employee.name ||
                              `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                              employee.employeeNumber ||
                              employee.user_id
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-700">
                          {employee.user_name ||
                            employee.name ||
                            `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                            employee.employeeNumber ||
                            employee.user_id}
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

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createMutation.isPending
                ? "Processing..."
                : isEditing
                  ? "Update Variant"
                  : "Create Variant"}
            </Button>
          </div>
        </div>
      </form>

      {/* Employee Assignment Modal */}
      {showEmployeeAssignment && (
        <EmployeeAssignment
          onClose={() => {
            console.log("Closing Employee Assignment dialog");
            setShowEmployeeAssignment(false);
          }}
          preSelectedEmployees={assignedEmployees}
          applicableGenders={[]}
          onAssign={async (selectedEmployees) => {
            try {
              // For new variants, just update local state - assignments will be created when variant is saved
              if (!variant?.id) {
                setAssignedEmployees(selectedEmployees);
                toast({
                  title: "Success",
                  description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} will be assigned when variant is created.`,
                });
                return;
              }

              // For existing variants, save assignments immediately
              const assignments = selectedEmployees.map((emp) => ({
                userId: emp.user_id || emp.id, // Support both user_id and id fields
                leaveVariantId: variant.id,
                assignmentType: "pto_variant",
              }));
              console.log("PTO Assignment payload:", assignments);

              await apiRequest("POST", "/api/employee-assignments/bulk", {
                assignments,
              });

              // Update local state with selected employees
              setAssignedEmployees(selectedEmployees);

              // Invalidate the query to refresh data
              queryClient.invalidateQueries({
                queryKey: [`/api/employee-assignments/${variant.id}`],
              });

              toast({
                title: "Success",
                description: `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} assigned successfully.`,
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

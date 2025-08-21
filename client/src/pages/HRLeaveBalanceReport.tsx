import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Filter, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function HRLeaveBalanceReport() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLeaveType, setSelectedLeaveType] = useState("all");

  // Get org_id from localStorage - use current org from JWT token
  const currentOrgId = localStorage.getItem("org_id");

  console.log("[HR Report] Current org_id:", currentOrgId);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch external employee data for additional fields
  const { employees: externalEmployees } = useExternalEmployeeData();

  // Pro-rata recalculation mutation
  const recalculateProRataMutation = useMutation({
    mutationFn: async () => {
      console.log("[ProRata] Triggering automatic pro-rata system");
      console.log(
        "[ProRata] External employee data available:",
        !!externalEmployees,
        externalEmployees?.length || 0,
      );

      return await apiRequest("/api/recalculate-prorata-balances", {
        method: "POST",
        body: JSON.stringify({
          externalEmployeeData: externalEmployees || [], // Pass external data if available, empty array if not
        }),
      });
    },
    onSuccess: (result) => {
      console.log("[ProRata] Success:", result);
      toast({
        title: "Pro-rata calculation complete",
        description: `Updated leave balances for ${result.processedEmployees} employees using actual joining dates`,
      });
      // Refresh all data
      queryClient.invalidateQueries({
        queryKey: ["/api/employee-leave-balances/all"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/leave-balance-transactions/all"],
      });
    },
    onError: (error: any) => {
      console.error("[ProRata] Error:", error);
      toast({
        title: "Pro-rata calculation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Automatically trigger pro-rata system when page loads (once per session)
  React.useEffect(() => {
    console.log("[ProRata] Automatic pro-rata system check:", {
      hasExternalData: !!externalEmployees,
      externalCount: externalEmployees?.length || 0,
      isPending: recalculateProRataMutation.isPending,
      orgId: currentOrgId,
    });

    if (!recalculateProRataMutation.isPending) {
      // Check if we need to trigger automatic system (only once per session)
      const hasTriggeredKey = `prorata_triggered_${currentOrgId}`;
      const hasTriggered = sessionStorage.getItem(hasTriggeredKey);

      if (!hasTriggered) {
        console.log(
          "[ProRata] Triggering automatic pro-rata system (creates assignments + pro-rata calculations)",
        );

        if (externalEmployees && externalEmployees.length > 0) {
          console.log(
            "[ProRata] Using external employee data for accurate joining dates",
          );
        } else {
          console.log(
            "[ProRata] External API not available, using fallback system for user 14674",
          );
        }

        sessionStorage.setItem(hasTriggeredKey, "true");
        recalculateProRataMutation.mutate();
      } else {
        console.log("[ProRata] Already triggered for this session, skipping");
      }
    }
  }, [externalEmployees, currentOrgId, recalculateProRataMutation.isPending]);

  // Separate mutation for "After Earning" recalculation
  const recalculateAfterEarningMutation = useMutation({
    mutationFn: async () => {
      console.log(
        "[AfterEarning] Triggering balance recalculation for After Earning leave types",
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
        "[AfterEarning] Balance recalculation completed successfully",
      );
      // Force refresh of data after recalculation
      queryClient.invalidateQueries({
        queryKey: [`/api/employee-leave-balances/all`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/leave-balance-transactions/all`],
      });
    },
    onError: (error) => {
      console.error("[AfterEarning] Balance recalculation failed:", error);
    },
  });

  // Fetch leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  // Fetch all leave variants
  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  // Fetch all employee assignments
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  // Fetch all employee leave balances
  const { data: allBalances = [] } = useQuery({
    queryKey: [`/api/employee-leave-balances/all`],
    queryFn: () =>
      fetch(`/api/employee-leave-balances/all?year=${selectedYear}`, {
        headers: { "X-Org-Id": currentOrgId },
      }).then((res) => res.json()),
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
  });

  // Fetch all leave balance transactions for detailed calculations
  const { data: allTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/all`],
    queryFn: () =>
      fetch(`/api/leave-balance-transactions/all`, {
        headers: { "X-Org-Id": currentOrgId },
      }).then((res) => res.json()),
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
  });

  // Fetch all leave requests for accurate availed calculations (same method as Leave Applications page)
  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: !!currentOrgId,
  });

  // Check for "After Earning" leave types and trigger recalculation when HR report loads
  React.useEffect(() => {
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
            "[AfterEarning] Found After Earning leave types, triggering balance recalculation:",
            afterEarningVariants.map((v: any) => ({
              id: v.id,
              name: v.leaveVariantName,
            })),
          );

          sessionStorage.setItem(hasRecalculatedKey, "true");
          recalculateAfterEarningMutation.mutate();
        } else {
          console.log("[AfterEarning] Already recalculated today, skipping");
        }
      }
    }
  }, [leaveVariants, currentOrgId, recalculateAfterEarningMutation.isPending]);

  // Debug logging
  console.log("[HR Report] Debug data:");
  console.log("All balances:", (allBalances as any[])?.length || 0);
  console.log("All transactions:", (allTransactions as any[])?.length || 0);
  console.log("All assignments:", (allAssignments as any[])?.length || 0);
  console.log("Leave variants:", (leaveVariants as any[])?.length || 0);
  console.log("External employees:", (externalEmployees as any[])?.length || 0);

  // DEBUG: Check external employee data and type_id fields
  console.log(
    "[HR Report] External employees sample:",
    externalEmployees?.slice(0, 3),
  );
  console.log(
    "[HR Report] JWT token available:",
    !!localStorage.getItem("jwt_token"),
  );

  // DEBUG: Check if any employee has type_id_0 and type_id_1 data
  const employeeWithTypeIds = externalEmployees?.find(
    (emp: any) => emp.type_id_0 || emp.type_id_1,
  );
  console.log("[HR Report] Employee with type_id data:", employeeWithTypeIds);

  // DEBUG: Check specific employee 015 (Ashwani Khanna) in external data
  const employee015 = externalEmployees?.find(
    (emp: any) => emp.employee_number === "015" || emp.user_id === "015",
  );
  console.log("[HR Report] Employee 015 in external data:", employee015);

  // DEBUG: If no external data, show guidance message
  if (!externalEmployees || externalEmployees.length === 0) {
    console.warn(
      "[HR Report] ⚠️ No external employee data loaded. Location and Department will show N/A.",
    );
    console.warn(
      "[HR Report] 💡 To fix this, you need to provide a JWT token for external API access.",
    );
    console.warn(
      "[HR Report] 📋 Use /fix-location-department.html to setup JWT token.",
    );
  }

  // Debug pro-rata recalculation status
  console.log("[ProRata] Recalculation status:", {
    hasTriggered: sessionStorage.getItem(`prorata_triggered_${currentOrgId}`),
    isPending: recalculateProRataMutation.isPending,
    isSuccess: recalculateProRataMutation.isSuccess,
    isError: recalculateProRataMutation.isError,
    error: recalculateProRataMutation.error,
  });

  // Debug: Find who has employee_number DB061
  const db061Employee = externalEmployees?.find(
    (emp: any) => emp.employee_number === "DB061",
  );
  console.log("[HR Report] DB061 Employee found:", db061Employee);

  // Debug: Find user 2162 balance data
  const user2162Balances = allBalances?.filter((b: any) => b.userId === "2162");
  console.log("[HR Report] User 2162 balances:", user2162Balances);

  // Get unique employee IDs from both assignments AND leave balances to include Excel imported employees
  const assignmentUserIds = (allAssignments as any[]).map(
    (assignment: any) => assignment.userId,
  );
  const balanceUserIds = (allBalances as any[]).map(
    (balance: any) => balance.userId,
  );
  const employeeIds = Array.from(
    new Set([...assignmentUserIds, ...balanceUserIds]),
  );
  console.log("[HR Report] Employee IDs from assignments:", assignmentUserIds);
  console.log("[HR Report] Employee IDs from balances:", balanceUserIds);
  console.log("[HR Report] Combined employee IDs:", employeeIds);

  // Create comprehensive report data
  const reportData = employeeIds
    .flatMap((userId: string) => {
      // Find employee in external data
      const employee = externalEmployees?.find(
        (emp: any) =>
          emp.user_id?.toString() === userId ||
          emp.id?.toString() === userId ||
          emp.employee_number?.toString() === userId,
      );

      // Get user assignments
      const userAssignments = allAssignments.filter(
        (assignment: any) => assignment.userId === userId,
      );
      const assignedVariantIds = userAssignments.map(
        (assignment: any) => assignment.leaveVariantId,
      );

      // Get user balances
      const userBalances = allBalances.filter(
        (balance: any) => balance.userId === userId,
      );

      // Get user transactions
      const userTransactions = allTransactions.filter(
        (transaction: any) => transaction.userId === userId,
      );

      // CRITICAL FIX: Group by LEAVE TYPE instead of variants to prevent duplicates
      // Use combination of assigned variants AND balance variants to ensure complete coverage
      const balanceVariantIds = userBalances.map(
        (balance: any) => balance.leaveVariantId,
      );
      const relevantVariantIds = [
        ...new Set([...assignedVariantIds, ...balanceVariantIds]),
      ];

      // Group variants by leave type to prevent duplicates
      const leaveTypeGroups = new Map<
        number,
        { variants: number[]; balance?: any }
      >();

      relevantVariantIds.forEach((variantId: number) => {
        const variant = leaveVariants.find((v: any) => v.id === variantId);
        const balance = userBalances.find(
          (b: any) => b.leaveVariantId === variantId,
        );

        if (variant?.leaveTypeId) {
          if (!leaveTypeGroups.has(variant.leaveTypeId)) {
            leaveTypeGroups.set(variant.leaveTypeId, {
              variants: [],
              balance: undefined,
            });
          }

          const group = leaveTypeGroups.get(variant.leaveTypeId)!;
          group.variants.push(variantId);

          // Use balance from any variant that has one (prioritize actual balances)
          if (
            balance &&
            (!group.balance || parseFloat(balance.totalEntitlement || "0") > 0)
          ) {
            group.balance = balance;
          } else if (!group.balance) {
            // Create a default balance for assigned variants without actual balances
            group.balance = {
              userId: userId,
              leaveVariantId: variantId,
              totalEntitlement: "0",
              currentBalance: "0",
              usedBalance: "0",
            };
          }
        }
      });

      // Debug for user 225 to track duplicate fix
      if (userId === "225") {
        console.log(`[HR Report DUPLICATE FIX] User ${userId}:`, {
          assignedVariantIds,
          balanceVariantIds,
          relevantVariantIds,
          leaveTypeGroups: Array.from(leaveTypeGroups.entries()).map(
            ([ltId, group]) => ({
              leaveTypeId: ltId,
              variants: group.variants,
              hasBalance: !!group.balance,
            }),
          ),
        });
      }

      // Create a row for each leave type (not variant)
      return Array.from(leaveTypeGroups.entries()).map(
        ([leaveTypeId, group]) => {
          const leaveType = leaveTypes.find((lt: any) => lt.id === leaveTypeId);
          const balance = group.balance;

          // Debug specific mapping for leave types
          if (leaveTypeId === 68) {
            // Casual & Sick Leave type
            console.log("[HR Report] Casual & Sick Leave mapping debug:", {
              userId,
              leaveTypeId,
              leaveType,
              balance,
              groupVariants: group.variants,
              allLeaveTypes: leaveTypes?.map((lt) => ({
                id: lt.id,
                name: lt.name,
              })),
              allVariants: leaveVariants?.map((v) => ({
                id: v.id,
                name: v.leaveVariantName,
                leaveTypeId: v.leaveTypeId,
              })),
            });
          }

          // Get transactions for ALL variants of this leave type
          const leaveTypeTransactions = userTransactions.filter((t: any) => {
            const transactionVariant = leaveVariants.find(
              (v: any) => v.id === t.leaveVariantId,
            );
            return transactionVariant?.leaveTypeId === leaveTypeId;
          });

          // Debug for user 015 to see why AVAILED is 0.0
          if (userId === "015") {
            console.log(
              `[HR Report User 015 Debug] Leave Type ${leaveTypeId}:`,
              {
                userTransactions: userTransactions.length,
                leaveTypeTransactions: leaveTypeTransactions.length,
                userTransactionSample: userTransactions.slice(0, 3),
                leaveTypeTransactionSample: leaveTypeTransactions.slice(0, 3),
                searchingForLeaveTypeId: leaveTypeId,
                userTransactionVariantIds: [
                  ...new Set(userTransactions.map((t) => t.leaveVariantId)),
                ],
              },
            );
          }

          // Use exact same calculation logic as Leave Applications summary table

          // Calculate opening balance from imported Excel data transactions
          // Only count the most recent "Opening balance imported from Excel" transaction to avoid duplicates
          const openingBalanceTransactions = leaveTypeTransactions
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

          // Database now stores in full day units, no conversion needed
          const openingBalance =
            openingBalanceTransactions.length > 0
              ? parseFloat(openingBalanceTransactions[0].amount || "0")
              : 0;

          // For "After Earning" leave types, eligibility should be the calculated earned amount based on months elapsed
          // For "In Advance" leave types, eligibility should be total entitlement minus opening balance
          const variantData = leaveVariants?.find(
            (v: any) => v.id === balance?.leaveVariantId,
          );
          const leaveTypeData = leaveTypes?.find(
            (lt: any) => lt.id === variantData?.leaveTypeId,
          );

          // Check both variant data and leave type data for "After Earning" setting
          const isAfterEarning =
            variantData?.grantLeaves === "after_earning" ||
            leaveTypeData?.grantLeaves === "after_earning" ||
            balance?.grantLeaves === "after_earning";
          const currentBalanceInDays = balance
            ? parseFloat(balance.currentBalance || "0")
            : 0;
          const totalEntitlementInDays = balance
            ? parseFloat(balance.totalEntitlement || "0")
            : 0;

          // Debug for user 015 detection
          if (userId === "015") {
            console.log(
              `[HR Report Detection Debug] User ${userId} Leave Type ${leaveTypeId}:`,
              {
                variantData,
                leaveTypeData,
                balance,
                isAfterEarning,
                variantGrantLeaves: variantData?.grantLeaves,
                leaveTypeGrantLeaves: leaveTypeData?.grantLeaves,
                balanceGrantLeaves: balance?.grantLeaves,
              },
            );
          }

          let eligibility = 0;

          if (isAfterEarning) {
            // For "After Earning" leave types, calculate eligibility based on completed months
            // Formula: (Annual entitlement ÷ 12) × Completed months

            // Find employee joining date from external API
            const employee = externalEmployees?.find(
              (emp: any) =>
                emp.user_id?.toString() === userId ||
                emp.id?.toString() === userId ||
                emp.employee_number?.toString() === userId,
            );

            const joiningDate = employee?.date_of_joining;
            const currentYear = new Date().getFullYear();
            const currentDate = new Date();

            if (joiningDate && variantData) {
              // Parse joining date (DD-MMM-YYYY format from external API)
              const joinDate = new Date(joiningDate);
              const joinYear = joinDate.getFullYear();

              // Calculate completed months since joining for "After Earning"
              let completedMonths = 0;

              if (joinYear < currentYear) {
                // Employee joined before current year - count completed months from Jan 1 to current month
                // For "After Earning", only count completed months, not the current month
                completedMonths = currentDate.getMonth(); // 0-based month (current month not included)
              } else if (joinYear === currentYear) {
                // Employee joined in current year - calculate months from joining month to current month
                const monthsSinceJoining =
                  currentDate.getMonth() - joinDate.getMonth();
                completedMonths = Math.max(0, monthsSinceJoining); // Only completed full months
              }

              // Calculate eligibility: (Annual entitlement ÷ 12) × Completed months
              const annualEntitlement =
                variantData?.paidDaysInYear || totalEntitlementInDays || 0;
              eligibility =
                Math.round((annualEntitlement / 12) * completedMonths * 2) / 2; // Round to nearest 0.5

              // Debug for user 015 (Ashwani Khanna)
              if (userId === "015") {
                console.log(
                  `[HR Report After Earning Debug] User ${userId} Leave Type ${leaveTypeId}:`,
                  {
                    joiningDate,
                    joinDate: joinDate.toISOString(),
                    currentYear,
                    currentDate: currentDate.toISOString(),
                    completedMonths,
                    annualEntitlement,
                    monthlyRate: annualEntitlement / 12,
                    calculatedEligibility: eligibility,
                    expectedFor6Months: (18 / 12) * 6,
                  },
                );
              }
            } else {
              // Fallback: use current balance if no joining date available
              eligibility = currentBalanceInDays;
            }
          } else {
            // For "In Advance" leave types, check if employee joined before current year
            // If so, they get full entitlement. If mid-year joiner, they get pro-rated amount.

            // Find employee joining date from external API
            const employee = externalEmployees?.find(
              (emp: any) =>
                emp.user_id?.toString() === userId ||
                emp.id?.toString() === userId ||
                emp.employee_number?.toString() === userId,
            );

            const joiningDate = employee?.date_of_joining;
            const currentYear = new Date().getFullYear();

            if (joiningDate) {
              // Parse joining date (DD-MMM-YYYY format from external API)
              const joinYear = new Date(joiningDate).getFullYear();

              if (joinYear < currentYear) {
                // Employee joined before current year - check grant frequency
                const variantConfiguredAmount =
                  variantData?.paidDaysInYear || 0;
                const grantFrequency =
                  variantData?.grantFrequency || "per_year";

                if (grantFrequency === "per_year") {
                  // For "In Advance" + "Per Year": Full annual amount is available immediately
                  eligibility = variantConfiguredAmount;
                } else {
                  // For "In Advance" + "Per Month": Pro-rated based on months elapsed
                  const currentDate = new Date();
                  const monthsFromYearStart = currentDate.getMonth() + 1; // 0-based month + 1
                  eligibility =
                    Math.round(
                      (variantConfiguredAmount / 12) * monthsFromYearStart * 2,
                    ) / 2; // Round to nearest 0.5
                }
              } else {
                // Employee joined in current year - check grant frequency
                const variantConfiguredAmount =
                  variantData?.paidDaysInYear || 0;
                const grantFrequency =
                  variantData?.grantFrequency || "per_year";

                if (grantFrequency === "per_year") {
                  // For "In Advance" + "Per Year": Full annual amount is available immediately
                  eligibility = variantConfiguredAmount;
                } else {
                  // For "In Advance" + "Per Month": Pro-rated based on remaining months
                  const joinDate = new Date(joiningDate);
                  const currentDate = new Date();
                  const endOfYear = new Date(currentYear, 11, 31); // December 31st

                  // Calculate remaining months from joining date to end of year
                  const remainingMonths = Math.max(
                    0,
                    (endOfYear.getFullYear() - joinDate.getFullYear()) * 12 +
                      (endOfYear.getMonth() - joinDate.getMonth()) +
                      1,
                  );

                  // Pro-rated eligibility = (configured annual amount / 12) * remaining months
                  eligibility =
                    Math.round(
                      (variantConfiguredAmount / 12) * remainingMonths * 2,
                    ) / 2; // Round to nearest 0.5
                }

                // Debug logging for Jainish Shah
                if (userId === "14674") {
                  console.log(
                    `[HR Report Pro-rata Debug] Jainish Shah User ${userId} Leave Type ${leaveTypeId} (${leaveTypeData?.name || "Unknown"}):`,
                    {
                      joiningDate,
                      variantConfiguredAmount,
                      monthlyRate: variantConfiguredAmount / 12,
                      calculatedEligibility: eligibility,
                    },
                  );
                }
              }
            } else {
              // No joining date available - use current balance
              eligibility = currentBalanceInDays;
            }

            // Debug logging for specific employees if needed
            if (userId === "14674" || userId === "58976" || userId === "225") {
              const variantConfiguredAmount = variantData?.paidDaysInYear || 0;
              const grantFrequency = variantData?.grantFrequency || "per_year";
              const joinYear = employee?.date_of_joining
                ? new Date(employee.date_of_joining).getFullYear()
                : null;

              console.log(
                `[HR Report Eligibility Debug] User ${userId} (${leaveTypeData?.name || "Unknown"}) Leave Type ${leaveTypeId}:`,
                {
                  balanceData: balance,
                  currentBalanceRaw: balance?.currentBalance,
                  currentBalanceInDays,
                  openingBalance,
                  calculatedEligibility: eligibility,
                  totalEntitlementInDays,
                  variantConfiguredAmount,
                  grantFrequency,
                  isAfterEarning: isAfterEarning,
                  joiningDate: employee?.date_of_joining,
                  joinYear,
                  joinedBeforeCurrentYear: joinYear < 2025,
                  eligibilityCalculationMethod:
                    grantFrequency === "per_year"
                      ? "full_annual_amount"
                      : "pro_rata_calculation",
                },
              );
            }
          }

          // For employees with imported Excel data, eligibility includes opening balance
          // For pro-rated employees (no opening balance), eligibility is just the calculated amount
          const totalEligibility =
            openingBalance > 0 ? eligibility + openingBalance : eligibility;

          // Debug logging for user 58976 (Ananth BS) to identify source of incorrect 234.5 eligibility
          if (userId === "58976") {
            console.log(
              `[HR Report Ananth BS Debug] User 58976 Leave Type ${leaveTypeId}:`,
              {
                leaveTypeName: leaveTypeData?.name,
                eligibilityCalculated: eligibility,
                openingBalanceFromTransactions: openingBalance,
                totalEligibilityFinal: totalEligibility,
                balanceData: balance,
                currentBalanceInDays,
                totalEntitlementInDays,
                leaveTypeTransactions: leaveTypeTransactions?.length || 0,
                isAfterEarning,
                employee: externalEmployees?.find(
                  (emp: any) =>
                    emp.user_id?.toString() === userId ||
                    emp.id?.toString() === userId ||
                    emp.employee_number?.toString() === userId,
                ),
              },
            );
          }

          // FIXED: Calculate availed using same method as Leave Applications page
          // Use approved leave requests instead of transactions for accuracy
          const userLeaveRequests = allLeaveRequests.filter(
            (req: any) => req.userId === userId,
          );

          // Get requests for this leave type specifically
          const leaveTypeRequests = userLeaveRequests.filter((req: any) => {
            // Match by leaveTypeId (primary method)
            if (req.leaveTypeId === leaveTypeId) {
              return true;
            }

            // Fallback: Match by variant's leaveTypeId if request has leaveVariantId
            const requestVariant = leaveVariants.find(
              (v: any) => v.id === req.leaveVariantId,
            );
            if (requestVariant?.leaveTypeId === leaveTypeId) {
              return true;
            }

            return false;
          });

          // Calculate availed from approved requests only (consistent with Leave Applications page)
          const approvedRequests = leaveTypeRequests.filter(
            (req: any) => req.status === "approved",
          );
          const availed = approvedRequests.reduce((sum: number, req: any) => {
            return sum + parseFloat(req.totalDays || "0");
          }, 0);

          // Debug for user 241 (Sanjay) to verify correct calculation
          if (userId === "241") {
            console.log(
              `[HR Report SANJAY FIXED] Leave Type ${leaveTypeId} (${leaveTypeData?.name}):`,
              {
                totalUserRequests: userLeaveRequests.length,
                leaveTypeRequests: leaveTypeRequests.length,
                approvedRequests: approvedRequests.length,
                availedDays: availed,
                approvedRequestDetails: approvedRequests.map((req) => ({
                  id: req.id,
                  startDate: req.startDate,
                  endDate: req.endDate,
                  totalDays: req.totalDays,
                  reason: req.reason,
                })),
              },
            );
          }

          // Enhanced debug final AVAILED result for specific users
          if (userId === "239" || userId === "241") {
            console.log(
              `[HR Report AVAILED FIXED] User ${userId}, Leave Type ${leaveTypeId} (${leaveTypeData?.name}):`,
              {
                availedAmount: availed,
                calculationMethod:
                  "request-based (same as Leave Applications page)",
                approvedRequestsCount: approvedRequests.length,
              },
            );
          }

          // Calculate LOP from transactions (Loss of Pay) - already in full days
          const lop = leaveTypeTransactions
            .filter(
              (t: any) =>
                (t.transactionType === "debit" ||
                  t.transactionType === "deduction") &&
                (t.description?.toLowerCase().includes("lop") ||
                  t.description?.toLowerCase().includes("loss of pay")),
            )
            .reduce(
              (sum: number, t: any) =>
                sum + Math.abs(parseFloat(t.amount || "0")),
              0,
            );

          // Calculate encashed from transactions - already in full days
          const encashed = leaveTypeTransactions
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
          const lapsed = leaveTypeTransactions
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

          // Find employee data for display purposes
          const employee = externalEmployees?.find(
            (emp: any) =>
              emp.user_id?.toString() === userId ||
              emp.id?.toString() === userId ||
              emp.employee_number?.toString() === userId,
          );

          // DEBUG: Log employee lookup for specific users
          if (userId === "015" || userId === "128" || userId === "225") {
            console.log(`[HR Report MAPPING DEBUG] User ${userId}:`, {
              employeeFound: !!employee,
              employeeData: employee,
              type_id_0: employee?.type_id_0,
              type_id_1: employee?.type_id_1,
              allExternalEmployees: externalEmployees?.length,
              lookupMatches: externalEmployees?.filter(
                (emp: any) =>
                  emp.user_id?.toString() === userId ||
                  emp.id?.toString() === userId ||
                  emp.employee_number?.toString() === userId,
              ),
            });
          }

          return {
            employeeNo: employee?.employee_number || userId,
            employeeName:
              employee?.user_name ||
              (employee?.first_name && employee?.last_name
                ? `${employee.first_name} ${employee.last_name}`
                : `Employee ${userId}`),
            location: employee?.type_id_0 || "N/A",
            department: employee?.type_id_1 || "N/A",
            leaveType: leaveTypeData?.name || leaveType?.name || "Unknown",
            opBalance: Number(openingBalance || 0).toFixed(1),
            eligibility: Number(eligibility || 0).toFixed(1),
            totalEligibility: Number(totalEligibility || 0).toFixed(1),
            availed: Number(availed || 0).toFixed(1),
            leaveLapsed: Number(lapsed || 0).toFixed(1),
            leaveEncashed: Number(encashed || 0).toFixed(1),
            closingBalance: Number(closingBalance || 0).toFixed(1),
            userId,
            leaveTypeId: leaveTypeData?.id || leaveType?.id,
          };
        },
      );
    })
    .filter(Boolean);

  // Debug: Check for Casual & Sick Leave data
  const casualSickData = reportData.filter(
    (row: any) => row.leaveType === "Casual & Sick Leave",
  );
  console.log(
    "[HR Report] Casual & Sick Leave data found:",
    casualSickData.length,
    casualSickData,
  );

  // Debug specific user mapping for "015" employee
  casualSickData.forEach((row: any, index: number) => {
    if (index < 5) {
      // Log first 5 for debugging
      console.log(
        `[HR Report] Row ${index}: Employee No=${row.employeeNo}, Name=${row.employeeName}, UserId=${row.userId}, Eligibility=${row.eligibility}`,
      );
    }
    if (row.employeeNo === "015") {
      console.log(`[HR Report] FOUND ASHWANI KHANNA (015):`, {
        employeeNo: row.employeeNo,
        employeeName: row.employeeName,
        userId: row.userId,
        eligibility: row.eligibility,
        totalEligibility: row.totalEligibility,
        openingBalance: row.opBalance,
        availed: row.availed,
        closingBalance: row.closingBalance,
        fullRowData: row,
      });
    }
  });

  // Debug: Check all leave types in report data
  const allLeaveTypesInData = [
    ...new Set(reportData.map((row: any) => row.leaveType)),
  ];
  console.log(
    "[HR Report] All leave types in report data:",
    allLeaveTypesInData,
  );

  // Debug: Check selected leave type filter
  console.log("[HR Report] Selected leave type filter:", selectedLeaveType);
  console.log(
    "[HR Report] Available leave types for dropdown:",
    leaveTypes?.map((lt: any) => ({ id: lt.id, name: lt.name })),
  );

  // Apply filters
  const filteredData = reportData.filter((row: any) => {
    const matchesSearch =
      !searchTerm ||
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employeeNo.toString().includes(searchTerm);

    const matchesLocation =
      selectedLocation === "all" || row.location === selectedLocation;
    const matchesDepartment =
      selectedDepartment === "all" || row.department === selectedDepartment;
    const matchesLeaveType =
      selectedLeaveType === "all" ||
      row.leaveTypeId?.toString() === selectedLeaveType;

    // Debug specific filtering for Casual & Sick Leave
    if (row.leaveType === "Casual & Sick Leave") {
      console.log("[HR Report] Casual & Sick Leave row filter debug:", {
        rowLeaveTypeId: row.leaveTypeId,
        selectedLeaveType,
        matchesLeaveType,
        rowData: row,
      });
    }

    return (
      matchesSearch && matchesLocation && matchesDepartment && matchesLeaveType
    );
  });

  // Get unique values for filter options
  const locations = [
    ...new Set(reportData.map((row: any) => row.location)),
  ].filter(Boolean);
  const departments = [
    ...new Set(reportData.map((row: any) => row.department)),
  ].filter(Boolean);

  // Export to Excel function
  const exportToExcel = () => {
    const headers = [
      "Employee No",
      "Employee Name",
      "Location",
      "Department",
      "Leave Type",
      "Op Balance",
      "Eligibility",
      "Total Eligibility",
      "Availed",
      "Leave Lapsed",
      "Leave Encashed",
      "Closing Balance",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((row: any) =>
        [
          row.employeeNo,
          row.employeeName,
          row.location,
          row.department,
          row.leaveType,
          row.opBalance,
          row.eligibility,
          row.totalEligibility,
          row.availed,
          row.leaveLapsed,
          row.leaveEncashed,
          row.closingBalance,
        ]
          .map((cell) => `"${cell}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `HR_Leave_Balance_Report_${selectedYear}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                HR Leave Balance Report
              </h1>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Employee
                  </label>
                  <Input
                    placeholder="Name or Employee No..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <Select
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location: string) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <Select
                    value={selectedLeaveType}
                    onValueChange={setSelectedLeaveType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leave Types</SelectItem>
                      {leaveTypes.map((leaveType: any) => (
                        <SelectItem
                          key={leaveType.id}
                          value={leaveType.id.toString()}
                        >
                          {leaveType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Leave Balance Report ({filteredData.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">
                        Employee No
                      </TableHead>
                      <TableHead className="font-semibold">
                        Employee Name
                      </TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">
                        Department
                      </TableHead>
                      <TableHead className="font-semibold">
                        Leave Type
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Op Balance
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Eligibility
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Total Eligibility
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Availed
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Leave Lapsed
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Leave Encashed
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Closing Balance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="text-center py-8 text-gray-500"
                        >
                          No data available for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row: any, index: number) => (
                        <TableRow
                          key={`${row.userId}-${row.leaveTypeId}`}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <TableCell className="font-medium">
                            {row.employeeNo}
                          </TableCell>
                          <TableCell>{row.employeeName}</TableCell>
                          <TableCell>{row.location}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.leaveType}</TableCell>
                          <TableCell className="text-right">
                            {row.opBalance}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.eligibility}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {row.totalEligibility}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.availed}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.leaveLapsed}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.leaveEncashed}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {row.closingBalance}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

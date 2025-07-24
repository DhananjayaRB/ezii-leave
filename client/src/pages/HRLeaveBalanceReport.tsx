import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const currentOrgId = localStorage.getItem('org_id') || '38';
  
  console.log('[HR Report] Current org_id:', currentOrgId);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch external employee data for additional fields
  const { employees: externalEmployees } = useExternalEmployeeData();

  // Pro-rata recalculation mutation
  const recalculateProRataMutation = useMutation({
    mutationFn: async () => {
      console.log('[ProRata] Triggering automatic pro-rata system');
      console.log('[ProRata] External employee data available:', !!externalEmployees, externalEmployees?.length || 0);
      
      return await apiRequest('/api/recalculate-prorata-balances', {
        method: 'POST',
        body: JSON.stringify({
          externalEmployeeData: externalEmployees || [] // Pass external data if available, empty array if not
        })
      });
    },
    onSuccess: (result) => {
      console.log('[ProRata] Success:', result);
      toast({
        title: "Pro-rata calculation complete",
        description: `Updated leave balances for ${result.processedEmployees} employees using actual joining dates`,
      });
      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ["/api/employee-leave-balances/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance-transactions/all"] });
    },
    onError: (error: any) => {
      console.error('[ProRata] Error:', error);
      toast({
        title: "Pro-rata calculation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Automatically trigger pro-rata system when page loads (once per session)
  React.useEffect(() => {
    console.log('[ProRata] Automatic pro-rata system check:', {
      hasExternalData: !!externalEmployees,
      externalCount: externalEmployees?.length || 0,
      isPending: recalculateProRataMutation.isPending,
      orgId: currentOrgId
    });
    
    if (!recalculateProRataMutation.isPending) {
      // Check if we need to trigger automatic system (only once per session)
      const hasTriggeredKey = `prorata_triggered_${currentOrgId}`;
      const hasTriggered = sessionStorage.getItem(hasTriggeredKey);
      
      if (!hasTriggered) {
        console.log('[ProRata] Triggering automatic pro-rata system (creates assignments + pro-rata calculations)');
        
        if (externalEmployees && externalEmployees.length > 0) {
          console.log('[ProRata] Using external employee data for accurate joining dates');
        } else {
          console.log('[ProRata] External API not available, using fallback system for user 14674');
        }
        
        sessionStorage.setItem(hasTriggeredKey, 'true');
        recalculateProRataMutation.mutate();
      } else {
        console.log('[ProRata] Already triggered for this session, skipping');
      }
    }
  }, [externalEmployees, currentOrgId, recalculateProRataMutation.isPending]);

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
    queryFn: () => fetch(`/api/employee-leave-balances/all?year=${selectedYear}`, {
      headers: { 'X-Org-Id': currentOrgId }
    }).then(res => res.json()),
    staleTime: 0, // Force fresh data
    refetchOnMount: true
  });

  // Fetch all leave balance transactions for detailed calculations
  const { data: allTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/all`],
    queryFn: () => fetch(`/api/leave-balance-transactions/all`, {
      headers: { 'X-Org-Id': currentOrgId }
    }).then(res => res.json()),
    staleTime: 0, // Force fresh data
    refetchOnMount: true
  });

  // Debug logging
  console.log('[HR Report] Debug data:');
  console.log('All balances:', allBalances?.length || 0, allBalances);
  console.log('All transactions:', allTransactions?.length || 0, allTransactions); 
  console.log('All assignments:', allAssignments?.length || 0, allAssignments);
  console.log('Leave variants:', leaveVariants?.length || 0);
  console.log('External employees:', externalEmployees?.length || 0, externalEmployees);
  
  // Debug pro-rata recalculation status
  console.log('[ProRata] Recalculation status:', {
    hasTriggered: sessionStorage.getItem(`prorata_triggered_${currentOrgId}`),
    isPending: recalculateProRataMutation.isPending,
    isSuccess: recalculateProRataMutation.isSuccess,
    isError: recalculateProRataMutation.isError,
    error: recalculateProRataMutation.error
  });
  
  // Debug: Find who has employee_number DB061
  const db061Employee = externalEmployees?.find((emp: any) => emp.employee_number === 'DB061');
  console.log('[HR Report] DB061 Employee found:', db061Employee);
  
  // Debug: Find user 2162 balance data
  const user2162Balances = allBalances?.filter((b: any) => b.userId === '2162');
  console.log('[HR Report] User 2162 balances:', user2162Balances);

  // Get unique employee IDs from both assignments AND leave balances to include Excel imported employees
  const assignmentUserIds = allAssignments.map((assignment: any) => assignment.userId);
  const balanceUserIds = allBalances.map((balance: any) => balance.userId);
  const employeeIds = [...new Set([...assignmentUserIds, ...balanceUserIds])];
  console.log('[HR Report] Employee IDs from assignments:', assignmentUserIds);
  console.log('[HR Report] Employee IDs from balances:', balanceUserIds);
  console.log('[HR Report] Combined employee IDs:', employeeIds);

  // Create comprehensive report data
  const reportData = employeeIds.flatMap((userId: string) => {
    // Find employee in external data
    const employee = externalEmployees?.find((emp: any) => 
      emp.user_id?.toString() === userId || 
      emp.id?.toString() === userId ||
      emp.employee_number?.toString() === userId
    );

    // Get user assignments
    const userAssignments = allAssignments.filter((assignment: any) => assignment.userId === userId);
    const assignedVariantIds = userAssignments.map((assignment: any) => assignment.leaveVariantId);

    // Get user balances
    const userBalances = allBalances.filter((balance: any) => balance.userId === userId);
    
    // Get user transactions
    const userTransactions = allTransactions.filter((transaction: any) => transaction.userId === userId);

    // For imported employees without assignments, use their balance variants
    // For employees with assignments, use their assigned variants
    const relevantVariantIds = assignedVariantIds.length > 0 
      ? assignedVariantIds 
      : userBalances.map((balance: any) => balance.leaveVariantId);

    // Create a row for each relevant leave type
    return relevantVariantIds.map((variantId: number) => {
      const variant = leaveVariants.find((v: any) => v.id === variantId);
      const leaveType = leaveTypes.find((lt: any) => lt.id === variant?.leaveTypeId);
      const balance = userBalances.find((b: any) => b.leaveVariantId === variantId);
      
      // Get transactions for this specific leave variant
      const variantTransactions = userTransactions.filter((t: any) => t.leaveVariantId === variantId);

      // Use exact same calculation logic as Leave Applications summary table
      
      // Calculate opening balance from imported Excel data transactions
      // Only count the most recent "Opening balance imported from Excel" transaction to avoid duplicates
      const openingBalanceTransactions = variantTransactions
        .filter((t: any) => t.transactionType === 'grant' && 
               t.description?.toLowerCase().includes('opening balance imported from excel'))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Database now stores in full day units, no conversion needed
      const openingBalance = openingBalanceTransactions.length > 0 
        ? parseFloat(openingBalanceTransactions[0].amount || '0') 
        : 0;
      
      // For "After Earning" leave types, eligibility should be the calculated earned amount based on months elapsed
      // For "In Advance" leave types, eligibility should be total entitlement minus opening balance
      const variantData = variant || leaveVariants?.find((v: any) => v.id === balance?.leaveVariantId);
      const leaveTypeData = leaveTypes?.find((lt: any) => lt.id === variantData?.leaveTypeId);
      
      const isAfterEarning = leaveTypeData?.grantLeaves === 'after_earning' || balance?.grantLeaves === 'after_earning';
      const currentBalanceInDays = balance ? parseFloat(balance.currentBalance || '0') : 0;
      const totalEntitlementInDays = balance ? parseFloat(balance.totalEntitlement || '0') : 0;
      
      let eligibility = 0;
      
      if (isAfterEarning) {
        // For "After Earning" leave types, find earned amount from accrual transactions
        // Look for transactions that represent earned amounts from monthly accrual
        const earnedTransactions = variantTransactions.filter((t: any) => 
          t.transactionType === 'grant' && 
          (t.description?.toLowerCase().includes('after earning calculation') ||
           t.description?.toLowerCase().includes('months ×') ||
           t.description?.toLowerCase().includes('automatic balance calculation') ||
           t.description?.toLowerCase().includes('balance computation') ||
           t.description?.toLowerCase().includes('first login auto-calculation') ||
           t.description?.toLowerCase().includes('after earning'))
        );
        
        if (earnedTransactions.length > 0) {
          // Sum up all earned amounts from accrual transactions
          eligibility = earnedTransactions.reduce((sum: number, t: any) => 
            sum + parseFloat(t.amount || '0'), 0
          );
        } else {
          // Fallback: For "After Earning" types, if no earned transactions found,
          // eligibility = current balance minus opening balance
          eligibility = Math.max(0, currentBalanceInDays - openingBalance);
        }
      } else {
        // For "In Advance" leave types, check if employee joined before current year
        // If so, they get full entitlement. If mid-year joiner, they get pro-rated amount.
        
        // Find employee joining date from external API
        const employee = externalEmployees?.find((emp: any) => 
          emp.user_id?.toString() === userId || 
          emp.id?.toString() === userId ||
          emp.employee_number?.toString() === userId
        );
        
        const joiningDate = employee?.date_of_joining;
        const currentYear = new Date().getFullYear();
        
        if (joiningDate) {
          // Parse joining date (DD-MMM-YYYY format from external API)
          const joinYear = new Date(joiningDate).getFullYear();
          
          if (joinYear < currentYear) {
            // Employee joined before current year - give full entitlement
            // Use totalEntitlementInDays but only if it seems reasonable (not corrupted by duplicates)
            // If totalEntitlementInDays is way higher than expected, use the variant's configured amount
            const variantConfiguredAmount = variantData?.paidDaysInYear || 0;
            const maxReasonableAmount = variantConfiguredAmount * 2; // Allow some buffer for carry-forward etc.
            
            if (totalEntitlementInDays > 0 && totalEntitlementInDays <= maxReasonableAmount) {
              eligibility = totalEntitlementInDays;
            } else {
              // Fallback to configured amount if totalEntitlement seems corrupted
              eligibility = variantConfiguredAmount;
            }
          } else {
            // Employee joined in current year - calculate pro-rated amount
            const variantConfiguredAmount = variantData?.paidDaysInYear || 0;
            const joinDate = new Date(joiningDate);
            const currentDate = new Date();
            const endOfYear = new Date(currentYear, 11, 31); // December 31st
            
            // Calculate remaining months from joining date to end of year
            const remainingMonths = Math.max(0, 
              (endOfYear.getFullYear() - joinDate.getFullYear()) * 12 + 
              (endOfYear.getMonth() - joinDate.getMonth()) + 1
            );
            
            // Pro-rated eligibility = (configured annual amount / 12) * remaining months
            eligibility = Math.round((variantConfiguredAmount / 12) * remainingMonths * 2) / 2; // Round to nearest 0.5
            
            // Debug logging for Jainish Shah
            if (userId === '14674') {
              console.log(`[HR Report Pro-rata Debug] Jainish Shah User ${userId} Variant ${variantId} (${leaveTypeData?.name || 'Unknown'}):`, {
                joiningDate,
                joinDate: joinDate.toISOString(),
                currentYear,
                endOfYear: endOfYear.toISOString(),
                remainingMonths,
                variantConfiguredAmount,
                monthlyRate: variantConfiguredAmount / 12,
                calculatedEligibility: eligibility
              });
            }
          }
        } else {
          // No joining date available - use current balance
          eligibility = currentBalanceInDays;
        }
        
        // Debug logging for user 14674 (Jainish Shah) and user 58976 (Ananth BS)
        if (userId === '14674' || userId === '58976') {
          const variantConfiguredAmount = variantData?.paidDaysInYear || 0;
          const maxReasonableAmount = variantConfiguredAmount * 2;
          const joinYear = employee?.date_of_joining ? new Date(employee.date_of_joining).getFullYear() : null;
          
          console.log(`[HR Report Eligibility Debug] User ${userId} (${leaveTypeData?.name || 'Unknown'}) Variant ${variantId}:`, {
            balanceData: balance,
            currentBalanceRaw: balance?.currentBalance,
            currentBalanceInDays,
            openingBalance,
            calculatedEligibility: eligibility,
            totalEntitlementInDays,
            variantConfiguredAmount,
            maxReasonableAmount,
            usedTotalEntitlement: totalEntitlementInDays > 0 && totalEntitlementInDays <= maxReasonableAmount,
            isAfterEarning: isAfterEarning,
            joiningDate: employee?.date_of_joining,
            joinYear,
            joinedBeforeCurrentYear: joinYear < 2025
          });
        }
      }
      
      // For employees with imported Excel data, eligibility includes opening balance
      // For pro-rated employees (no opening balance), eligibility is just the calculated amount
      const totalEligibility = openingBalance > 0 ? eligibility + openingBalance : eligibility;
      
      // Debug logging for user 58976 (Ananth BS) to identify source of incorrect 234.5 eligibility
      if (userId === '58976') {
        console.log(`[HR Report Ananth BS Debug] User 58976 Variant ${variantId}:`, {
          leaveTypeName: leaveTypeData?.name,
          eligibilityCalculated: eligibility,
          openingBalanceFromTransactions: openingBalance,
          totalEligibilityFinal: totalEligibility,
          balanceData: balance,
          currentBalanceInDays,
          totalEntitlementInDays,
          variantTransactions: variantTransactions?.length || 0,
          isAfterEarning,
          employee: externalEmployees?.find((emp: any) => 
            emp.user_id?.toString() === userId || 
            emp.id?.toString() === userId ||
            emp.employee_number?.toString() === userId
          )
        });
      }
      
      // Calculate availed from transactions only (actual leave usage, not grants)
      // Include Excel imported availed leave data but exclude truly historical transactions
      const isBeforeWorkflow = variantData?.leaveBalanceDeductionBefore === true;
      
      // Debug logging for AVAILED calculation (including DB061 employee)
      const employee = externalEmployees?.find((emp: any) => 
        emp.user_id?.toString() === userId || 
        emp.id?.toString() === userId ||
        emp.employee_number?.toString() === userId
      );
      const isDebugUser = userId === '2161' || userId === '14674' || userId === '2176' || userId === '2162' || employee?.employee_number === 'DB061';
      
      // Extra debug for DB061 specifically
      if (employee?.employee_number === 'DB061' || userId === '2162' || userId === '2176') {
        console.log(`[HR Report DB061 Debug] Found user ${userId} with employee_number: ${employee?.employee_number}`);
        console.log(`[HR Report DB061 Debug] Variant transactions for user ${userId}:`, variantTransactions);
        console.log(`[HR Report DB061 Debug] Variant data for user ${userId}:`, variantData);
        console.log(`[HR Report DB061 Debug] Leave type data for user ${userId}:`, leaveTypeData);
      }
      
      if (isDebugUser) {
        console.log(`[HR Report AVAILED Debug] User ${userId}, Variant ${variantId} (${leaveTypeData?.name || 'Unknown'}):`, {
          variantName: leaveTypeData?.name || 'Unknown',
          isBeforeWorkflow,
          leaveBalanceDeductionBefore: variantData?.leaveBalanceDeductionBefore,
          totalTransactions: variantTransactions.length,
          pendingDeductions: variantTransactions.filter(t => t.transactionType === 'pending_deduction').length,
          deductionTransactions: variantTransactions.filter(t => t.transactionType === 'deduction').length,
          allTransactionTypes: [...new Set(variantTransactions.map(t => t.transactionType))],
          variantData: variantData,
          allPendingTransactions: variantTransactions.filter(t => t.transactionType === 'pending_deduction').map(t => ({
            id: t.id,
            amount: t.amount,
            description: t.description
          }))
        });
      }
      
      const usageTransactions = variantTransactions.filter((t: any) => {
        const amount = parseFloat(t.amount || '0');
        const isDeductionType = t.transactionType === 'debit' || t.transactionType === 'deduction';
        const isNegativeAmount = amount < 0;
        const isPendingDeduction = t.transactionType === 'pending_deduction';
        
        // Only exclude specific historical transactions, not Excel imported availed leave
        // Include approved imported transactions but exclude "additional historical" and rejected ones
        const isExcludedHistorical = t.description?.toLowerCase().includes('additional historical availed leave') ||
                                    t.description?.toLowerCase().includes('status: rejected');
        
        // Exclude only specific historical transactions that don't represent current period usage
        if (isExcludedHistorical) {
          return false;
        }
        
        // For "before workflow" types, include pending deductions
        // For "after workflow" types, exclude pending deductions
        if (isPendingDeduction && !isBeforeWorkflow) {
          return false; // Don't include pending deductions for "after workflow" types
        }
        
        const shouldInclude = isDeductionType || isNegativeAmount || (isPendingDeduction && isBeforeWorkflow);
        
        // Debug logging for specific transactions  
        if (isDebugUser && (isPendingDeduction || isDeductionType || isNegativeAmount)) {
          console.log(`[HR Report] Transaction analysis:`, {
            id: t.id,
            type: t.transactionType,
            amount: t.amount,
            description: t.description,
            isBeforeWorkflow,
            isPendingDeduction,
            isDeductionType,
            isNegativeAmount,
            shouldInclude
          });
        }
        
        return shouldInclude;
      });
      
      const availed = usageTransactions.reduce((sum: number, t: any) => 
        sum + Math.abs(parseFloat(t.amount || '0')), 0
      );
      
      // Debug final AVAILED result
      if (isDebugUser) {
        console.log(`[HR Report AVAILED Result] User ${userId}, Variant ${variantId}:`, {
          usageTransactionsCount: usageTransactions.length,
          availedAmount: availed,
          usageTransactions: usageTransactions.map(t => ({
            id: t.id,
            type: t.transactionType,
            amount: t.amount,
            description: t.description
          }))
        });
      }
      
      // Calculate LOP from transactions (Loss of Pay) - already in full days
      const lop = variantTransactions
        .filter((t: any) => (t.transactionType === 'debit' || t.transactionType === 'deduction') && (t.description?.toLowerCase().includes('lop') || t.description?.toLowerCase().includes('loss of pay')))
        .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || '0')), 0);
      
      // Calculate encashed from transactions - already in full days
      const encashed = variantTransactions
        .filter((t: any) => (t.transactionType === 'debit' || t.transactionType === 'deduction') && t.description?.toLowerCase().includes('encash'))
        .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || '0')), 0);
      
      // Calculate lapsed from transactions - already in full days
      const lapsed = variantTransactions
        .filter((t: any) => (t.transactionType === 'debit' || t.transactionType === 'deduction') && t.description?.toLowerCase().includes('lapse'))
        .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || '0')), 0);
      
      // Calculate closing balance as: Total Eligibility - Availed
      const closingBalance = totalEligibility - availed;

      return {
        employeeNo: employee?.employee_number || userId,
        employeeName: employee?.user_name || 
                     (employee?.first_name && employee?.last_name ? 
                      `${employee.first_name} ${employee.last_name}` : 
                      `Employee ${userId}`),
        location: employee?.location || employee?.city || "N/A",
        department: employee?.department || employee?.dept_name || "N/A", 
        division: employee?.division || employee?.unit || "N/A",
        leaveType: leaveTypeData?.name || leaveType?.name || "Unknown",
        opBalance: Number(openingBalance || 0).toFixed(1),
        eligibility: Number(eligibility || 0).toFixed(1),
        totalEligibility: Number(totalEligibility || 0).toFixed(1),
        availed: Number(availed || 0).toFixed(1),
        leaveLapsed: Number(lapsed || 0).toFixed(1),
        leaveEncashed: Number(encashed || 0).toFixed(1),
        closingBalance: Number(closingBalance || 0).toFixed(1),
        userId,
        variantId,
        leaveTypeId: leaveTypeData?.id || leaveType?.id
      };
    });
  }).filter(Boolean);

  // Apply filters
  const filteredData = reportData.filter((row: any) => {
    const matchesSearch = !searchTerm || 
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employeeNo.toString().includes(searchTerm);
    
    const matchesLocation = selectedLocation === "all" || row.location === selectedLocation;
    const matchesDepartment = selectedDepartment === "all" || row.department === selectedDepartment;
    const matchesLeaveType = selectedLeaveType === "all" || row.leaveTypeId?.toString() === selectedLeaveType;

    return matchesSearch && matchesLocation && matchesDepartment && matchesLeaveType;
  });

  // Get unique values for filter options
  const locations = [...new Set(reportData.map((row: any) => row.location))].filter(Boolean);
  const departments = [...new Set(reportData.map((row: any) => row.department))].filter(Boolean);



  // Export to Excel function
  const exportToExcel = () => {
    const headers = [
      "Employee No", "Employee Name", "Location", "Department", "Division", 
      "Leave Type", "Op Balance", "Eligibility", "Total Eligibility", 
      "Availed", "Leave Lapsed", "Leave Encashed", "Closing Balance"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row: any) => [
        row.employeeNo, row.employeeName, row.location, row.department, row.division,
        row.leaveType, row.opBalance, row.eligibility, row.totalEligibility,
        row.availed, row.leaveLapsed, row.leaveEncashed, row.closingBalance
      ].map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `HR_Leave_Balance_Report_${selectedYear}.csv`);
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
              <h1 className="text-2xl font-semibold text-gray-900">HR Leave Balance Report</h1>
            </div>
            <div className="flex space-x-3">
              <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Employee</label>
                  <Input
                    placeholder="Name or Employee No..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location: string) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leave Types</SelectItem>
                      {leaveTypes.map((leaveType: any) => (
                        <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
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
                      <TableHead className="font-semibold">Employee No</TableHead>
                      <TableHead className="font-semibold">Employee Name</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Division</TableHead>
                      <TableHead className="font-semibold">Leave Type</TableHead>
                      <TableHead className="font-semibold text-right">Op Balance</TableHead>
                      <TableHead className="font-semibold text-right">Eligibility</TableHead>
                      <TableHead className="font-semibold text-right">Total Eligibility</TableHead>
                      <TableHead className="font-semibold text-right">Availed</TableHead>
                      <TableHead className="font-semibold text-right">Leave Lapsed</TableHead>
                      <TableHead className="font-semibold text-right">Leave Encashed</TableHead>
                      <TableHead className="font-semibold text-right">Closing Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                          No data available for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row: any, index: number) => (
                        <TableRow key={`${row.userId}-${row.variantId}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <TableCell className="font-medium">{row.employeeNo}</TableCell>
                          <TableCell>{row.employeeName}</TableCell>
                          <TableCell>{row.location}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.division}</TableCell>
                          <TableCell>{row.leaveType}</TableCell>
                          <TableCell className="text-right">{row.opBalance}</TableCell>
                          <TableCell className="text-right">{row.eligibility}</TableCell>
                          <TableCell className="text-right font-medium">{row.totalEligibility}</TableCell>
                          <TableCell className="text-right">{row.availed}</TableCell>
                          <TableCell className="text-right">{row.leaveLapsed}</TableCell>
                          <TableCell className="text-right">{row.leaveEncashed}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{row.closingBalance}</TableCell>
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
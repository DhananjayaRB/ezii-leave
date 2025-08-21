import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, XCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface LeaveRequest {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  leaveTypeId: number;
  workingDays: number;
  reason: string;
  createdAt: string;
}

interface LeaveBalance {
  id: number;
  userId: string;
  leaveVariantId: number;
  currentBalance: number;
  entitlement: number;
  totalEntitlement: number;
  leaveTypeName: string;
  leaveVariantName: string;
}

export default function NewEmployeeOverview() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Get current user ID from localStorage (same as Leave Applications)
  const currentUserId = localStorage.getItem('user_id') || '241';

  console.log('📊 [NewEmployeeOverview] Loading component for user:', currentUserId);
  console.log('📊 [NewEmployeeOverview] Current org_id:', localStorage.getItem('org_id'));

  // Fetch leave requests with proper typing
  const { data: leaveRequestsData = [] } = useQuery({
    queryKey: [`/api/leave-requests?userId=${currentUserId}`],
  });

  // Fetch leave balances with proper typing
  const { data: leaveBalancesData = [] } = useQuery({
    queryKey: [`/api/employee-leave-balances/${currentUserId}`],
  });

  // Fetch BTO and Comp-off data
  const { data: ptoRequestsData = [] } = useQuery({
    queryKey: [`/api/pto-requests?userId=${currentUserId}`],
  });

  const { data: compOffRequestsData = [] } = useQuery({
    queryKey: [`/api/comp-off-requests?userId=${currentUserId}`],
  });

  // Fetch leave transactions for trends chart
  const { data: leaveTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
  });

  // Fetch leave variants for calculations (needed for sophisticated metrics)
  const { data: leaveVariantsData = [] } = useQuery({
    queryKey: ['/api/leave-variants'],
  });

  // Fetch assignments to match Leave Applications logic
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['/api/employee-assignments'],
  });



  // Type the arrays properly
  const leaveRequests = leaveRequestsData as LeaveRequest[];
  const leaveBalances = leaveBalancesData as LeaveBalance[];
  const ptoRequests = ptoRequestsData as any[];
  const compOffRequests = compOffRequestsData as any[];
  const transactions = leaveTransactions as any[];

  // Calculate statistics using same sophisticated logic as Leave Applications page
  const totalRequests = leaveRequests.length;
  const approvedLeaves = leaveRequests.filter((req: LeaveRequest) => req.status === 'approved');
  const approvedCount = approvedLeaves.length;
  const pendingCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'pending').length;
  const rejectedCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'rejected').length;

  // Debug approved leaves for calendar
  console.log('[NewEmployeeOverview] Approved leaves for calendar:', approvedLeaves.map(l => ({ id: l.id, startDate: l.startDate, endDate: l.endDate })));

  // EXACT CALCULATION from working Leave Applications screen
  const calculateSophisticatedMetrics = () => {
    const balancesArray = Array.isArray(leaveBalances) ? leaveBalances : [];
    const requestsArray = Array.isArray(leaveRequests) ? leaveRequests : [];
    const transactionsArray = Array.isArray(transactions) ? transactions : [];
    const variantsArray = Array.isArray(leaveVariantsData) ? leaveVariantsData : [];

    console.log('🎯 [NewEmployeeOverview] EXACT Leave Applications calculation:', {
      currentUserId,
      orgId: localStorage.getItem('org_id'),
      balancesCount: balancesArray.length,
      requestsCount: requestsArray.length,
      transactionsCount: transactionsArray.length,
      variantsCount: variantsArray.length
    });

    // Use assignment filtering to match Leave Applications logic
    const currentUserAssignments = Array.isArray(allAssignments) ? 
      allAssignments.filter((a: any) => String(a.userId) === String(currentUserId)) : [];

    const assignedVariantIds = currentUserAssignments.map((a: any) => a.leaveVariantId);
    const availableLeaveVariants = variantsArray.filter((variant: any) => 
      assignedVariantIds.includes(variant.id)
    );

    // TOTAL ELIGIBILITY calculation (exactly from Leave Applications)
    let totalEligibilitySum = 0;
    availableLeaveVariants.forEach((variant: any) => {
      const balance = balancesArray.find((b: any) => b.leaveVariantId === variant.id);
      const transactions = Array.isArray(transactionsArray) ? transactionsArray.filter((t: any) => t.leaveVariantId === variant.id) : [];

      // Calculate opening balance from imported Excel data transactions
      const openingBalanceTransactions = transactions
        .filter((t: any) => t.transactionType === 'grant' && 
               t.description?.toLowerCase().includes('opening balance imported from excel'))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const openingBalance = openingBalanceTransactions.length > 0 
        ? parseFloat(openingBalanceTransactions[0].amount || '0') 
        : 0;

      // Calculate eligibility based on leave grant method
      const totalEntitlementInDays = balance ? parseFloat(balance.totalEntitlement || '0') : 0;
      const isAfterEarning = variant.grantLeaves === 'after_earning';

      let eligibility = 0;

      if (isAfterEarning) {
        // "After Earning" - calculate based on annual entitlement and months completed
        const currentMonth = new Date().getMonth() + 1; // August = 8
        const monthsCompleted = currentMonth - 1; // 7 months completed (Jan-July)
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;
        eligibility = (annualEntitlement / 12) * monthsCompleted;
      } else {
        // "In Advance" - check grant frequency
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;

        if (variant.grantFrequency === 'per_year') {
          // Annual grants like Paternity Leave - full entitlement available immediately
          eligibility = annualEntitlement;
        } else {
          // Monthly grants - pro-rated amount for current month
          const currentMonth = new Date().getMonth() + 1; // August = 8
          eligibility = (annualEntitlement / 12) * currentMonth;
        }
      }
      const totalEligibility = eligibility + openingBalance;
      totalEligibilitySum += totalEligibility;
    });

    // TOTAL AVAILED calculation (exactly from Leave Applications)
    const allUserTransactions = (transactionsArray as any[]).filter((t: any) => t.userId === currentUserId);
    let totalAvailed = 0;

    availableLeaveVariants.forEach((variant: any) => {
      const isBeforeWorkflow = variant.leaveBalanceDeductionBefore === true;

      // Handle null leaveVariantId by using leaveTypeId as fallback with type conversion
      const matchingRequests = requestsArray.filter((req: any) => {
        const variantIdMatch = req.leaveVariantId === variant.id;
        const typeIdMatch = (req.leaveVariantId === null || req.leaveVariantId === undefined) && 
          (req.leaveTypeId === variant.leaveTypeId || 
           String(req.leaveTypeId) === String(variant.leaveTypeId) ||
           Number(req.leaveTypeId) === Number(variant.leaveTypeId));

        return variantIdMatch || typeIdMatch;
      });

      // Method 1: Count approved leave requests
      const approvedRequests = matchingRequests.filter((req: any) => req.status === 'approved');
      const approvedDays = approvedRequests.reduce((sum: number, req: any) => 
        sum + parseFloat(req.workingDays || '0'), 0
      );

      // Method 2: For "Before Workflow" types, add pending requests
      let pendingDays = 0;
      if (isBeforeWorkflow) {
        const pendingRequests = matchingRequests.filter((req: any) => req.status === 'pending');
        pendingDays = pendingRequests.reduce((sum: number, req: any) => 
          sum + parseFloat(req.workingDays || '0'), 0
        );
      }

      // Method 3: Add imported leave usage from Excel
      const variantTransactions = allUserTransactions.filter((t: any) => t.leaveVariantId === variant.id);
      const importedAvailed = variantTransactions.filter((t: any) => 
        t.description?.toLowerCase().includes('imported leave transaction') && 
        t.description?.toLowerCase().includes('availed') &&
        (t.transactionType === 'deduction' || t.transactionType === 'debit')
      ).reduce((sum: number, t: any) => 
        sum + Math.abs(parseFloat(t.amount || '0')), 0
      );

      const variantAvailed = approvedDays + pendingDays + importedAvailed;
      totalAvailed += variantAvailed;
    });

    // BALANCE calculation (exactly from Leave Applications)
    let totalClosingBalance = 0;
    availableLeaveVariants.forEach((variant: any) => {
      const balance = balancesArray.find((b: any) => b.leaveVariantId === variant.id);
      const transactions = Array.isArray(transactionsArray) ? transactionsArray.filter((t: any) => t.leaveVariantId === variant.id) : [];

      // Calculate opening balance from imported Excel data transactions
      const openingBalanceTransactions = transactions
        .filter((t: any) => t.transactionType === 'grant' && 
               t.description?.toLowerCase().includes('opening balance imported from excel'))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const openingBalance = openingBalanceTransactions.length > 0 
        ? parseFloat(openingBalanceTransactions[0].amount || '0') 
        : 0;

      const currentBalanceInDays = balance ? parseFloat(balance.currentBalance || '0') : 0;

      // Calculate eligibility based on leave grant method
      const totalEntitlementInDays = balance ? parseFloat(balance.totalEntitlement || '0') : 0;
      const isAfterEarning = variant.grantLeaves === 'after_earning';

      let eligibility = 0;

      if (isAfterEarning) {
        const currentMonth = new Date().getMonth() + 1; // August = 8
        const monthsCompleted = currentMonth - 1; // 7 months completed (Jan-July)
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;
        eligibility = (annualEntitlement / 12) * monthsCompleted;
      } else {
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;

        if (variant.grantFrequency === 'per_year') {
          eligibility = annualEntitlement;
        } else {
          const currentMonth = new Date().getMonth() + 1; // August = 8
          eligibility = (annualEntitlement / 12) * currentMonth;
        }
      }
      const totalEligibility = eligibility + openingBalance;

      // Calculate availed using same logic as table
      const isBeforeWorkflow = variant.leaveBalanceDeductionBefore === true;

      const matchingRequests = requestsArray.filter((req: any) => 
        req.leaveVariantId === variant.id || 
        ((req.leaveVariantId === null || req.leaveVariantId === undefined) && req.leaveTypeId === variant.leaveTypeId)
      );

      const approvedRequests = matchingRequests.filter((req: any) => req.status === 'approved');
      const approvedDays = approvedRequests.reduce((sum: number, req: any) => 
        sum + parseFloat(req.workingDays || '0'), 0
      );

      let pendingDays = 0;
      if (isBeforeWorkflow) {
        const pendingRequests = matchingRequests.filter((req: any) => req.status === 'pending');
        pendingDays = pendingRequests.reduce((sum: number, req: any) => 
          sum + parseFloat(req.workingDays || '0'), 0
        );
      }

      const importedAvailed = transactions.filter((t: any) => 
        t.description?.toLowerCase().includes('imported leave transaction') && 
        t.description?.toLowerCase().includes('availed') &&
        (t.transactionType === 'deduction' || t.transactionType === 'debit')
      ).reduce((sum: number, t: any) => 
        sum + Math.abs(parseFloat(t.amount || '0')), 0
      );

      const availed = approvedDays + pendingDays + importedAvailed;
      const closingBalance = totalEligibility - availed;
      totalClosingBalance += closingBalance;
    });

    console.log('🎯 [NewEmployeeOverview] EXACT calculation results:', {
      totalEligibilitySum: totalEligibilitySum.toFixed(1),
      totalAvailed: totalAvailed.toFixed(1),
      totalClosingBalance: totalClosingBalance.toFixed(1)
    });

    return {
      totalEligibility: parseFloat(totalEligibilitySum.toFixed(1)),
      totalAvailed: parseFloat(totalAvailed.toFixed(1)),
      totalBalance: parseFloat(totalClosingBalance.toFixed(1))
    };
  };

  const sophisticatedMetrics = calculateSophisticatedMetrics();

  // Use sophisticated calculations for display
  const totalEntitlement = sophisticatedMetrics.totalEligibility;
  const totalAvailed = sophisticatedMetrics.totalAvailed;
  const totalBalance = sophisticatedMetrics.totalBalance;

  console.log('[NewEmployeeOverview] Final sophisticated metrics applied:', {
    totalEntitlement,
    totalAvailed,
    totalBalance,
    displayValues: {
      totalEntitlementDisplay: totalEntitlement.toFixed(1),
      totalAvailedDisplay: totalAvailed.toFixed(1),
      totalBalanceDisplay: totalBalance.toFixed(1)
    }
  });

  // Generate usage trends from leave requests (both approved and pending for demo)
  const generateUsageTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    console.log('[UsageTrends] DEBUG - Total leave requests:', leaveRequests.length);
    console.log('[UsageTrends] DEBUG - Approved leaves:', approvedLeaves.length);
    console.log('[UsageTrends] DEBUG - Pending leaves:', leaveRequests.filter(l => l.status === 'pending').length);

    // Use all leave requests (approved + pending) to show usage trends
    const relevantLeaves = leaveRequests; // Include all statuses for now to show data

    console.log('[UsageTrends] DEBUG - Using leaves for trends:', relevantLeaves.map(l => ({
      id: l.id,
      startDate: l.startDate,
      year: new Date(l.startDate).getFullYear(),
      month: new Date(l.startDate).getMonth(),
      workingDays: l.workingDays,
      status: l.status
    })));

    return months.map((month, index) => {
      // Filter leave requests for this month from 2025
      const monthLeaves = relevantLeaves.filter((leave: LeaveRequest) => {
        const startDate = new Date(leave.startDate);
        const leaveMonth = startDate.getMonth();
        const leaveYear = startDate.getFullYear();

        // Show 2025 data
        return leaveMonth === index && leaveYear === 2025;
      });

      console.log(`[UsageTrends] ${month} (${index}) - Found ${monthLeaves.length} leaves:`, 
        monthLeaves.map(l => ({ startDate: l.startDate, workingDays: l.workingDays, status: l.status })));

      // Calculate total usage for this month
      const totalUsage = monthLeaves.reduce((sum: number, leave: LeaveRequest) => {
        const days = parseFloat(leave.workingDays?.toString() || '0');
        console.log(`[UsageTrends] Adding ${days} days from leave:`, leave.startDate, leave.status);
        return sum + days;
      }, 0);

      console.log(`[UsageTrends] ${month} total usage:`, totalUsage);

      return {
        month,
        usage: totalUsage
      };
    });
  };

  const usageTrendsData = generateUsageTrends();

  // Debug the trends data
  console.log('[NewEmployeeOverview] Usage trends data:', usageTrendsData);
  console.log('[NewEmployeeOverview] Total approved leaves:', approvedLeaves.length);
  console.log('[NewEmployeeOverview] Sample approved leave:', approvedLeaves[0]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Calendar functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if this date has any leave (approved or pending)
      const hasLeave = leaveRequests.some((leave: LeaveRequest) => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        // Set hours to compare dates properly
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        currentDate.setHours(12, 0, 0, 0);
        return currentDate >= startDate && currentDate <= endDate;
      });

      // Get leave status for styling
      const leaveForDate = leaveRequests.find((leave: LeaveRequest) => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        currentDate.setHours(12, 0, 0, 0);
        return currentDate >= startDate && currentDate <= endDate;
      });

      // Style based on leave status
      let dayClasses = 'h-8 flex items-center justify-center text-sm rounded ';
      if (hasLeave && leaveForDate) {
        switch (leaveForDate.status) {
          case 'approved':
            dayClasses += 'bg-green-300 text-green-800 font-medium';
            break;
          case 'pending':
            dayClasses += 'bg-orange-300 text-orange-800 font-medium';
            break;
          case 'rejected':
            dayClasses += 'bg-red-300 text-red-800 font-medium';
            break;
          default:
            dayClasses += 'bg-gray-100 text-gray-800 font-medium';
        }
      } else {
        dayClasses += 'hover:bg-gray-100 text-gray-700';
      }

      days.push(
        <div key={day} className={dayClasses}>
          {day}
        </div>
      );
    }

    return days;
  };



  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">



      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Overview</h1>
          <p className="text-gray-600 mt-1">Your leave analytics and applications dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yearly">Yearly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leaves</p>
                <p className="text-3xl font-bold text-gray-900">{totalEntitlement.toFixed(1)}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Availed</p>
                <p className="text-3xl font-bold text-gray-900">{totalAvailed.toFixed(1)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="text-3xl font-bold text-gray-900">{totalBalance.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Reorganized for better space utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="leaves" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="leaves">Leaves ({totalRequests})</TabsTrigger>
                  <TabsTrigger value="pto">BTO ({ptoRequests.length})</TabsTrigger>
                  <TabsTrigger value="compoff">Comp-off ({compOffRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="leaves" className="space-y-4">
                  {leaveRequests.length > 0 ? (
                    <div className="space-y-3">
                      {leaveRequests.slice(0, 5).map((request: LeaveRequest, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">Leave Request</span>
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' : 
                                'destructive'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">{request.workingDays} working days</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No leave applications found
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pto">
                  <div className="text-center py-8 text-gray-500">
                    {ptoRequests.length === 0 ? 'No BTO requests found' : `${ptoRequests.length} BTO requests`}
                  </div>
                </TabsContent>

                <TabsContent value="compoff">
                  <div className="text-center py-8 text-gray-500">
                    {compOffRequests.length === 0 ? 'No comp-off requests found' : `${compOffRequests.length} comp-off requests`}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Leave Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">
                    {new Date(currentYear, currentMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  {renderCalendar()}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-300 rounded"></div>
                    <span className="text-gray-600">Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-300 rounded"></div>
                    <span className="text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-300 rounded"></div>
                    <span className="text-gray-600">Rejected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Section - Now positioned to fill empty space */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Bar dataKey="usage" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Debug data without header */}
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                <p>Total requests: {leaveRequests.length}</p>
                <p>Approved: {approvedLeaves.length}</p>
                <p>Chart data points: {usageTrendsData.length}</p>
                <div className="mt-2">
                  {usageTrendsData.filter(d => d.usage > 0).map(d => (
                    <span key={d.month} className="mr-2">
                      {d.month}: {d.usage}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
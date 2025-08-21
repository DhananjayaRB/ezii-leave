import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, ExternalLink, AlertCircle, Calendar, Clock, Plane, Users, Plus, CheckCircle, XCircle, Timer, FileText, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from "@/components/Layout";
import { fetchEmployeeData } from "@/lib/externalApi";
import { getStoredJWTToken } from "@/lib/jwtUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWorkPattern } from "@/hooks/useWorkPattern";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AdminOverview() {
  const [activeRequestTab, setActiveRequestTab] = useState("Leaves");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApprovalTab, setSelectedApprovalTab] = useState("Pending");
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState("Leaves");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedPeriod, setSelectedPeriod] = useState("Yearly");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<any>(null);
  const [showLeavePopup, setShowLeavePopup] = useState(false);

  const currentUserId = localStorage.getItem('user_id') || '1';

  // Get work pattern data for leave calculations (keep this for other functionality)  
  const { workPattern, holidays: workPatternHolidays, isHoliday: workPatternIsHoliday, isWorkingDay, getHolidayDetails: workPatternGetHolidayDetails } = useWorkPattern();



  // Fetch holidays from external API (same as Holidays page)
  const { data: allHolidaysData } = useQuery({
    queryKey: ['/external/holidays'],
    queryFn: async () => {
      const jwtToken = localStorage.getItem('jwt_token');
      console.log('🔑 [AdminOverview External Holidays] JWT token found:', !!jwtToken);

      if (!jwtToken) {
        throw new Error('JWT token not found in localStorage');
      }

      console.log('🌐 [AdminOverview External Holidays] Calling API: https://qa-api.resolveindia.com/organization/holidays');
      const response = await fetch('https://qa-api.resolveindia.com/organization/holidays', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🌐 [AdminOverview External Holidays] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🌐 [AdminOverview External Holidays] Error response:', errorText);
        throw new Error(`Failed to fetch holidays: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🌐 [AdminOverview External Holidays] Response data:', result);
      return result.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true
  });

  // Fetch local holidays for fallback
  const { data: dbHolidays = [] } = useQuery({
    queryKey: ["/api/holidays"],
  });

  // Use external holidays if available, fallback to database holidays (same logic as Holidays page)
  const allHolidays = allHolidaysData && allHolidaysData.length > 0 
    ? allHolidaysData 
    : (dbHolidays || []);

  // Filter holidays based on user's work pattern selectedHolidays (same as Holidays page)
  const filteredHolidays = workPattern && workPattern.selectedHolidays 
    ? allHolidays.filter((holiday: any) => workPattern.selectedHolidays.includes(holiday.id))
    : allHolidays;

  // Fetch all required data
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: compOffRequests = [] } = useQuery({
    queryKey: ["/api/comp-off-requests"],
  });

  const { data: ptoRequests = [] } = useQuery({
    queryKey: ["/api/pto-requests"],
  });

  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["/api/employee-leave-balances"],
  });

  const { data: leaveTransactions = [] } = useQuery({
    queryKey: ["/api/leave-balance-transactions"],
  });

  // Fetch external employee data - MUST be before conditional return
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        const jwtToken = getStoredJWTToken();
        if (jwtToken) {
          const employeeData = await fetchEmployeeData();
          if (employeeData && Array.isArray(employeeData)) {
            setAllEmployees(employeeData);
          }
        }
      } catch (error) {
        console.error('[AdminOverview] Failed to load employee data:', error);
      }
    };

    loadEmployeeData();
  }, []);

  // Helper function to get employee name from external data
  const getEmployeeName = (userId: string) => {
    const employee = allEmployees.find((emp: any) => 
      emp.user_id?.toString() === userId || 
      emp.id?.toString() === userId ||
      emp.employee_number?.toString() === userId
    );

    if (employee) {
      return employee.user_name || 
             (employee.first_name && employee.last_name ? `${employee.first_name} ${employee.last_name}` : null) ||
             employee.employee_number || 
             `Employee ${userId}`;
    }
    return `Employee ${userId}`;
  };

  // Get employee initials for avatars
  const getEmployeeInitials = (userId: string) => {
    const name = getEmployeeName(userId);
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };



  // Calculate analytics data from real transactions
  const calculateAnalytics = () => {
    const currentRequests = leaveRequests as any[];
    const transactions = leaveTransactions as any[];

    console.log('[AdminOverview] Calculating analytics from:', {
      transactionCount: transactions.length,
      requestCount: currentRequests.length,
      sampleTransaction: transactions[0],
      sampleRequest: currentRequests[0],
      requestStatuses: Array.from(new Set(currentRequests.map(r => r.status))),
      transactionData: transactions.slice(0, 2)
    });

    const pending = currentRequests.filter(req => req.status === 'pending').length;
    const approved = currentRequests.filter(req => req.status === 'approved').length;
    const rejected = currentRequests.filter(req => req.status === 'rejected').length;

    console.log('[AdminOverview] Request status counts:', {
      pending,
      approved,
      rejected,
      total: currentRequests.length
    });
    const onLeave = currentRequests.filter(req => {
      if (req.status !== 'approved') return false;
      const today = new Date();
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);
      return today >= startDate && today <= endDate;
    }).length;

    // Calculate transaction-based metrics with detailed logging
    console.log('[AdminOverview] Transaction analysis:', {
      totalTransactions: transactions.length,
      sampleTransactions: transactions.slice(0, 3),
      transactionTypes: Array.from(new Set(transactions.map(t => t.transactionType))),
      descriptions: Array.from(new Set(transactions.map(t => t.description))).slice(0, 10)
    });

    const deductionTransactions = transactions.filter(t => 
      t.transactionType === 'deduction' && 
      !t.description?.includes('Opening balance') &&
      !t.description?.includes('imported from Excel')
    );

    const availed = Math.abs(deductionTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0));

    const additionTransactions = transactions.filter(t => t.transactionType === 'addition');
    const totalGranted = additionTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const encashedTransactions = transactions.filter(t => t.description?.includes('encashed'));
    const encashed = Math.abs(encashedTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0));

    const lapsedTransactions = transactions.filter(t => t.description?.includes('lapsed'));
    const lapsed = Math.abs(lapsedTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0));

    const carryForwardTransactions = transactions.filter(t => t.description?.includes('carry forward'));
    const carryForward = carryForwardTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    console.log('[AdminOverview] Analytics breakdown:', {
      deductionCount: deductionTransactions.length,
      additionCount: additionTransactions.length,
      totalGrantedHalfDays: totalGranted,
      totalAvailedHalfDays: availed,
      encashed,
      lapsed,
      carryForward,
      sampleDeduction: deductionTransactions[0],
      sampleAddition: additionTransactions[0]
    });

    // Calculate working days from approved requests
    const approvedRequests = currentRequests.filter(req => req.status === 'approved');

    console.log('[AdminOverview] Working days calculation debug:', {
      totalRequests: currentRequests.length,
      approvedCount: approvedRequests.length,
      sampleApproved: approvedRequests.slice(0, 10).map(req => ({
        id: req.id,
        workingDays: req.workingDays,
        workingDaysType: typeof req.workingDays,
        workingDaysParsed: parseFloat(req.workingDays || 0),
        status: req.status,
        leaveTypeName: req.leaveTypeName
      }))
    });

    const workingDaysAvailed = approvedRequests.reduce((sum, req) => {
      const days = parseFloat(req.workingDays || 0);
      return sum + days;
    }, 0);

    console.log('[AdminOverview] Working days total calculation:', {
      totalWorkingDays: workingDaysAvailed,
      approvedRequestCount: approvedRequests.length,
      averageDaysPerRequest: workingDaysAvailed / (approvedRequests.length || 1)
    });

    console.log('[AdminOverview] Final analytics result:', {
      pending,
      approved,
      rejected,
      onLeave,
      workingDaysAvailed,
      totalGranted: Math.round(totalGranted / 2),
      totalAvailed: Math.round(availed / 2)
    });

    return {
      totalGranted: Math.round(totalGranted / 2), // Convert from half-days to days, NO FALLBACK
      pendingApprovals: pending,
      totalOnLeave: onLeave,
      totalAvailed: workingDaysAvailed || Math.round(availed / 2), // Use actual working days
      totalRejected: rejected,
      absent: 0, // Calculate based on actual attendance data
      totalLossOfPay: 0, // Calculate from transactions
      totalLapsed: Math.round(lapsed / 2),
      totalEncashed: Math.round(encashed / 2),
      carryForward: Math.round(carryForward / 2),
      withdrawals: currentRequests.filter(req => req.status === 'withdrawal_pending').length
    };
  };

  // Calculate monthly data from real transactions
  const calculateMonthlyData = () => {
    const transactions = leaveTransactions as any[];
    const requests = leaveRequests as any[];

    console.log('[AdminOverview] Raw data analysis:', {
      transactionCount: transactions.length,
      requestCount: requests.length,
      selectedYear,
      sampleTransaction: transactions[0],
      sampleRequest: requests[0],
      requestYears: requests.map(r => new Date(r.startDate).getFullYear()).filter((v, i, a) => a.indexOf(v) === i),
      transactionYears: transactions.map(t => new Date(t.createdAt || t.transactionDate).getFullYear()).filter((v, i, a) => a.indexOf(v) === i)
    });

    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];

      // Filter approved requests for this month across all years
      const monthRequests = requests.filter(req => {
        if (req.status !== 'approved') return false;
        const startDate = new Date(req.startDate);
        return startDate.getMonth() === monthIndex;
      });

      // Now that leave type names are working, calculate by actual leave type
      const leaveByType: Record<string, number> = {};

      monthRequests.forEach(req => {
        const leaveTypeName = req.leaveTypeName || 'Other Leave';
        const workingDays = parseFloat(req.workingDays) || 1;
        leaveByType[leaveTypeName] = (leaveByType[leaveTypeName] || 0) + workingDays;

        // Debug each request processing
        if (monthIndex === 0) { // Only log for January to avoid spam
          console.log(`[AdminOverview] Processing ${monthName} request:`, {
            id: req.id,
            leaveTypeName: req.leaveTypeName,
            workingDays: req.workingDays,
            startDate: req.startDate,
            status: req.status
          });
        }
      });

      const total = Object.values(leaveByType).reduce((sum, days) => sum + days, 0);

      return {
        month: monthName,
        breakdown: leaveByType,
        total,
        requestCount: monthRequests.length
      };
    });

    console.log('[AdminOverview] Monthly data calculated:', monthlyData);
    return monthlyData;
  };

  const analytics = calculateAnalytics();
  const monthlyData = calculateMonthlyData();

  // Get all configured leave types from database (includes all types, even with zero usage)
  const configuredLeaveTypeNames = (leaveTypes as any[])?.map(lt => lt.name) || [];

  // Get leave types that have actual requests
  const usedLeaveTypes = Array.from(new Set((leaveRequests as any[])?.map(req => req.leaveTypeName).filter(Boolean) || []));

  // Combine both lists to show ALL leave types (configured ones + any others from requests)
  const allLeaveTypes = Array.from(new Set([...configuredLeaveTypeNames, ...usedLeaveTypes]));

  console.log('[AdminOverview] Debug leave types analysis:', {
    totalRequests: (leaveRequests as any[])?.length || 0,
    configuredLeaveTypes: configuredLeaveTypeNames,
    usedLeaveTypes: usedLeaveTypes,
    allLeaveTypes: allLeaveTypes,
    leaveTypeCount: allLeaveTypes.length,
    sampleRequests: (leaveRequests as any[])?.slice(0, 5).map(req => ({
      id: req.id,
      leaveTypeName: req.leaveTypeName,
      leaveTypeId: req.leaveTypeId,
      status: req.status
    }))
  });

  // Create dynamic color mapping for leave types
  const leaveTypeColors: Record<string, string> = {};
  const colorClasses = ['bg-blue-500', 'bg-orange-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
  allLeaveTypes.forEach((leaveType, index) => {
    leaveTypeColors[leaveType] = colorClasses[index % colorClasses.length];
  });



  // Calculate reason for leaves data
  const calculateReasonData = () => {
    const approvedRequests = (leaveRequests as any[]).filter(req => req.status === 'approved');
    const reasonCounts: { [key: string]: number } = {};

    approvedRequests.forEach(req => {
      const reason = req.reason || 'Other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    return Object.entries(reasonCounts).map(([reason, count]) => ({
      name: reason.charAt(0).toUpperCase() + reason.slice(1),
      value: count
    }));
  };

  const reasonData = calculateReasonData();
  const totalReasons = reasonData.reduce((sum, item) => sum + item.value, 0);

  // Tab data
  const requestTabs = [
    { id: "Leaves", label: "Leaves", count: (leaveRequests as any[]).length },
    { id: "Leave Plans", label: "Leave Plans", count: 7 }, // This would be from a different API
    { id: "BTO", label: "BTO", count: (ptoRequests as any[]).length },
    { id: "Comp-off", label: "Comp-off", count: (compOffRequests as any[]).length }
  ];

  const approvalTabs = [
    { id: "All", label: "All" },
    { id: "Pending", label: "Pending", count: analytics.pendingApprovals, highlight: true },
    { id: "Approved", label: "Approved" },
    { id: "Rejected", label: "Rejected" }
  ];

  // Get current requests to display
  const getCurrentRequests = () => {
    let requests = leaveRequests as any[];

    if (activeRequestTab === "BTO") {
      requests = ptoRequests as any[];
    } else if (activeRequestTab === "Comp-off") {
      requests = compOffRequests as any[];
    }

    if (selectedApprovalTab === "Pending") {
      return requests.filter(req => req.status === 'pending').slice(0, 4);
    } else if (selectedApprovalTab === "Approved") {
      return requests.filter(req => req.status === 'approved').slice(0, 4);
    } else if (selectedApprovalTab === "Rejected") {
      return requests.filter(req => req.status === 'rejected').slice(0, 4);
    }

    return requests.slice(0, 4);
  };

  const currentRequests = getCurrentRequests();

  // Calendar helper functions
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDaysDuration = (startDate: string, endDate: string, workingDays?: number) => {
    if (workingDays) return `${workingDays} working days`;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} days`;
  };

  // Calendar generation
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= lastDay || currentDay.getDay() !== 0) {
      const day = new Date(currentDay);
      const dayNumber = day.getDate();
      const isCurrentMonth = day.getMonth() === month;
      const isToday = day.toDateString() === new Date().toDateString();
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const holiday = workPatternIsHoliday ? workPatternIsHoliday(day) : false;
      const holidayDetails = holiday && workPatternGetHolidayDetails ? workPatternGetHolidayDetails(day) : null;

      // Find approved leaves for this day
      const leavesOnDay = (leaveRequests as any[]).filter(req => {
        if (req.status !== 'approved') return false;
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        return day >= startDate && day <= endDate;
      });

      days.push({
        date: day,
        dayNumber,
        isCurrentMonth,
        isToday,
        isWeekend,
        holiday: holidayDetails,
        leaves: leavesOnDay
      });

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <div className="flex items-center space-x-2">
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
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yearly">Yearly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Granted</p>
                  <p className="text-2xl font-bold">{analytics.totalGranted}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold">{analytics.pendingApprovals}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Timer className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Leave Today</p>
                  <p className="text-2xl font-bold">{analytics.totalOnLeave}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Plane className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Availed</p>
                  <p className="text-2xl font-bold">{analytics.totalAvailed}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Requests */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Approval Requests</span>
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {/* Request Type Tabs */}
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                {requestTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRequestTab(tab.id)}
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeRequestTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Approval Status Tabs */}
              <div className="flex space-x-4 mt-4">
                {approvalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedApprovalTab(tab.id)}
                    className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                      selectedApprovalTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        tab.highlight 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {selectedApprovalTab.toLowerCase()} requests found
                  </div>
                ) : (
                  currentRequests.map((request: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getEmployeeInitials(request.userId || request.user_id)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {getEmployeeName(request.userId || request.user_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activeRequestTab === "BTO" ? (
                              `${request.timeType} • ${formatDateRange(request.requestDate, request.requestDate)}`
                            ) : activeRequestTab === "Comp-off" ? (
                              `${request.actionType} • ${formatDateRange(request.workedDate || request.requestDate, request.workedDate || request.requestDate)}`
                            ) : (
                              `${formatDateRange(request.startDate, request.endDate)} • ${getDaysDuration(request.startDate, request.endDate, request.workingDays)}`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          request.status === 'approved' ? 'default' :
                          request.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && (
                          <div className="flex space-x-1">
                            <Button size="sm" className="h-6 px-2 text-xs">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Calendar</span>
                </CardTitle>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-32 text-center">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-1">{day}</div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const hasLeaves = day.leaves.length > 0;
                    const multipleEmployees = day.leaves.length > 1;

                    return (
                      <div key={index}>
                        {hasLeaves ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div
                                className={`
                                  aspect-square p-1 text-xs border rounded relative cursor-pointer hover:bg-gray-100
                                  ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                                  ${day.isToday ? 'bg-primary text-primary-foreground' : ''}
                                  ${day.isWeekend ? 'text-muted-foreground' : ''}
                                  ${day.holiday ? 'bg-red-50 text-red-600' : ''}
                                  ${hasLeaves ? 'bg-green-50 border-green-200' : ''}
                                `}
                              >
                                <div className="text-center font-semibold">{day.dayNumber}</div>
                                {hasLeaves && (
                                  <div className="absolute inset-x-1 bottom-1 space-y-0.5">
                                    {day.leaves.slice(0, 2).map((leave: any, leaveIndex: number) => (
                                      <div 
                                        key={leaveIndex}
                                        className="text-xs truncate px-1 py-0.5 bg-green-200 text-green-800 rounded"
                                        title={getEmployeeName(leave.userId)}
                                      >
                                        {getEmployeeName(leave.userId).split(' ')[0]}
                                      </div>
                                    ))}
                                    {multipleEmployees && day.leaves.length > 2 && (
                                      <div className="text-xs text-center text-green-700 font-semibold">
                                        +{day.leaves.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                )}
                                {day.holiday && (
                                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                                )}
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  Employees on Leave - {day.date.toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                {day.leaves.map((leave: any, leaveIndex: number) => (
                                  <div key={leaveIndex} className="flex items-center space-x-3 p-3 border rounded-lg">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-sm">
                                        {getEmployeeInitials(leave.userId)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-medium">{getEmployeeName(leave.userId)}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {leave.leaveTypeName || 'Leave'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDateRange(leave.startDate, leave.endDate)}
                                      </p>
                                      {leave.workingDays && (
                                        <p className="text-xs text-muted-foreground">
                                          {leave.workingDays} working days
                                        </p>
                                      )}
                                    </div>
                                    <Badge 
                                      variant={leave.status === 'approved' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {leave.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <div
                            className={`
                              aspect-square p-1 text-xs border rounded relative
                              ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                              ${day.isToday ? 'bg-primary text-primary-foreground' : ''}
                              ${day.isWeekend ? 'text-muted-foreground' : ''}
                              ${day.holiday ? 'bg-red-50 text-red-600' : ''}
                            `}
                          >
                            <div className="text-center">{day.dayNumber}</div>
                            {day.holiday && (
                              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Analytics</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Analytics Type Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              {["Leaves", "BTO", "Comp-off"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalyticsTab(tab)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    analyticsTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Analytics Sub-tabs */}
            <div className="flex space-x-6 mt-4">
              {[
                { id: "Availed", label: "Availed", color: "text-green-600", active: true }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    tab.active
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label} {tab.active && <span className="text-green-600">✓</span>}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Chart Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Leaves availed: {analytics.totalAvailed}</h3>
                <div className="flex items-center space-x-4">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stacked Bar Chart */}
              <div className="relative">
                <div className="flex items-end justify-between h-64 bg-gray-50 p-6 rounded-lg">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between h-full text-xs text-gray-500 mr-2">
                    <span>100</span>
                    <span>80</span>
                    <span>60</span>
                    <span>40</span>
                    <span>20</span>
                    <span>0</span>
                  </div>

                  {/* Chart bars */}
                  <div className="flex items-end justify-between flex-1 h-full space-x-4">
                    {monthlyData.map((data, i) => {
                      const maxValue = Math.max(...monthlyData.map(m => m.total), 50); // Minimum scale of 50
                      const heightPercentage = data.total > 0 ? Math.max((data.total / maxValue) * 100, 5) : 0;

                      // Chart rendering with enhanced visibility

                      return (
                        <div key={i} className="flex flex-col items-center space-y-1 flex-1 group relative">
                          <div 
                            className="w-full bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col-reverse cursor-pointer"
                            style={{ 
                              height: `${heightPercentage}%`, 
                              minHeight: data.total > 0 ? '20px' : '2px',
                              minWidth: '40px',
                              backgroundColor: data.total > 0 ? '#f3f4f6' : 'transparent'
                            }}
                          >
                            {/* Dynamic segments based on actual leave types */}
                            {data.total > 0 && allLeaveTypes.map(leaveType => {
                              const value = data.breakdown?.[leaveType] || 0;
                              if (value <= 0) return null;

                              return (
                                <div 
                                  key={leaveType}
                                  className={leaveTypeColors[leaveType]}
                                  style={{ 
                                    height: `${(value / data.total) * 100}%`,
                                    minHeight: '4px'
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Dynamic hover tooltip - shows on entire column hover */}
                          {data.total > 0 && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                                          bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-10 
                                          opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                                          whitespace-nowrap pointer-events-none">
                              <div className="font-semibold">{data.month} Details</div>
                              {allLeaveTypes.map(leaveType => {
                                const value = data.breakdown?.[leaveType] || 0;
                                if (value <= 0) return null;
                                return (
                                  <div key={leaveType}>{leaveType}: {value} days</div>
                                );
                              })}
                              <div className="border-t border-gray-600 mt-1 pt-1">
                                Total: {data.total} days
                              </div>
                            </div>
                          )}

                          <span className="text-xs text-gray-500">
                            {data.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Legend */}
                <div className="flex items-center justify-center flex-wrap gap-4 mt-4">
                  {allLeaveTypes.map(leaveType => {
                    const colorClass = leaveTypeColors[leaveType];
                    return (
                      <div key={leaveType} className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${colorClass}`}></div>
                        <span className="text-sm">{leaveType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>


            </div>
          </CardContent>
        </Card>

        {/* Upcoming Holidays Section Only */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Upcoming Holidays</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  console.log('[AdminOverview] External holidays data:', allHolidaysData);
                  console.log('[AdminOverview] DB holidays data:', dbHolidays);
                  console.log('[AdminOverview] All holidays:', allHolidays);
                  console.log('[AdminOverview] Filtered holidays:', filteredHolidays);
                  console.log('[AdminOverview] Work pattern selected holidays:', workPattern?.selectedHolidays);

                  // Use the same logic as Holidays page
                  const holidaysToDisplay = filteredHolidays;

                  if (!holidaysToDisplay || holidaysToDisplay.length === 0) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        No upcoming holidays configured
                      </div>
                    );
                  }

                  // Filter to show only upcoming holidays (future dates)
                  const now = new Date();
                  const upcomingHolidays = holidaysToDisplay
                    .filter((holiday: any) => {
                      try {
                        // Check both date and selectedDate fields (same as Holidays page)
                        const holidayDate = new Date(holiday.date || holiday.selectedDate);
                        return holidayDate >= now;
                      } catch {
                        return false;
                      }
                    })
                    .sort((a: any, b: any) => {
                      const dateA = new Date(a.date || a.selectedDate);
                      const dateB = new Date(b.date || b.selectedDate);
                      return dateA.getTime() - dateB.getTime();
                    })
                    .slice(0, 5);

                  if (upcomingHolidays.length === 0) {
                    return (
                      <div className="text-center py-4 text-muted-foreground">
                        No upcoming holidays
                      </div>
                    );
                  }

                  return upcomingHolidays.map((holiday: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{holiday.name || holiday.holidayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              // Use date or selectedDate field (same as Holidays page)
                              const dateString = holiday.date || holiday.selectedDate;
                              const date = new Date(dateString);

                              if (isNaN(date.getTime())) {
                                return 'Date not available';
                              }
                              return date.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              });
                            } catch (error) {
                              return 'Date not available';
                            }
                          })()}
                        </p>
                      </div>
                      <Badge variant="outline">Holiday</Badge>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Reports Section */}
        <div className="mt-6 space-y-6">
          {/* BTO Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>BTO Report</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive overview of all BTO requests with employee details
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee Name</TableHead>
                      <TableHead className="font-semibold">Application ID</TableHead>
                      <TableHead className="font-semibold">BTO Type</TableHead>
                      <TableHead className="font-semibold">From Date</TableHead>
                      <TableHead className="font-semibold">To Date</TableHead>
                      <TableHead className="font-semibold">Total Hours</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Applied Date</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const btoData = ptoRequests as any[];

                      if (btoData.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={9} className="py-8 px-4 text-center text-muted-foreground">
                              No BTO requests found for this organization
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return btoData.map((request: any, index: number) => (
                        <TableRow key={request.id || index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {getEmployeeName(request.userId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-800">
                              BTO-{request.id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {request.ptoVariantName || 'Standard BTO'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.fromDate ? new Date(request.fromDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric', 
                              year: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {request.toDate ? new Date(request.toDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {request.totalHours || request.hours || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'rejected' ? 'destructive' : 'outline'
                              }
                              className={
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                              }
                            >
                              {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm text-muted-foreground truncate" title={request.reason}>
                              {request.reason || 'No reason provided'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>

              {/* BTO Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total BTO Requests</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {(ptoRequests as any[]).length}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Approved</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(ptoRequests as any[]).filter((req: any) => req.status === 'approved').length}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">Pending</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {(ptoRequests as any[]).filter((req: any) => req.status === 'pending').length}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Rejected</div>
                  <div className="text-2xl font-bold text-red-900">
                    {(ptoRequests as any[]).filter((req: any) => req.status === 'rejected').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comp-off Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Comp-off Report</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed overview of all compensatory off requests and approvals
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee Name</TableHead>
                      <TableHead className="font-semibold">Application ID</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Work Date</TableHead>
                      <TableHead className="font-semibold">Comp-off Date</TableHead>
                      <TableHead className="font-semibold">Total Days</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Applied Date</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const compOffData = compOffRequests as any[];

                      if (compOffData.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={9} className="py-8 px-4 text-center text-muted-foreground">
                              No comp-off requests found for this organization
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return compOffData.map((request: any, index: number) => (
                        <TableRow key={request.id || index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {getEmployeeName(request.userId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-50 text-purple-800">
                              CO-{request.id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              {request.type?.charAt(0).toUpperCase() + request.type?.slice(1) || 'Standard'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.workDate ? new Date(request.workDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {request.compOffDate ? new Date(request.compOffDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {request.days || '1'} day{(request.days && request.days > 1) ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'rejected' ? 'destructive' : 'outline'
                              }
                              className={
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                              }
                            >
                              {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm text-muted-foreground truncate" title={request.reason}>
                              {request.reason || 'No reason provided'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>

              {/* Comp-off Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Total Comp-off Requests</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {(compOffRequests as any[]).length}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Approved</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(compOffRequests as any[]).filter((req: any) => req.status === 'approved').length}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">Pending</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {(compOffRequests as any[]).filter((req: any) => req.status === 'pending').length}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Rejected</div>
                  <div className="text-2xl font-bold text-red-900">
                    {(compOffRequests as any[]).filter((req: any) => req.status === 'rejected').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
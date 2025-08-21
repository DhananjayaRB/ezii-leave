import React, { useState, useEffect } from 'react';
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
  leaveTypeName: string;
  leaveVariantName: string;
}

export default function EmployeeOverview() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Debug logging to verify component is loading
  console.log('[EmployeeOverview] Component rendered with new analytics design');

  // Get current user ID from localStorage - MUST match current session
  const currentUserId = localStorage.getItem('user_id') || '241';
  
  // Debug current user ID
  console.log('🔍 [EmployeeOverview] Current user ID from localStorage:', currentUserId);

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({
    queryKey: [`/api/leave-requests?userId=${currentUserId}`],
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch leave balances
  const { data: leaveBalances = [], isLoading: balanceLoading } = useQuery({
    queryKey: [`/api/employee-leave-balances/${currentUserId}`],
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch BTO and Comp-off data
  const { data: ptoRequests = [] } = useQuery({
    queryKey: [`/api/pto-requests?userId=${currentUserId}`],
    staleTime: 0
  });

  const { data: compOffRequests = [] } = useQuery({
    queryKey: [`/api/comp-off-requests?userId=${currentUserId}`],
    staleTime: 0
  });

  // Fetch additional data needed for exact same calculations as LeaveApplications
  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  const { data: leaveTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
    enabled: !!currentUserId,
  });

  // SIMPLIFIED APPROACH - Use the SAME DATA that the cards currently show successfully
  const assignmentsArray = Array.isArray(allAssignments) ? allAssignments : [];
  const variantsArray = Array.isArray(leaveVariants) ? leaveVariants : [];
  const balancesArray = Array.isArray(leaveBalances) ? leaveBalances : [];
  const requestsArray = Array.isArray(leaveRequests) ? leaveRequests : [];
  
  // CRITICAL FIX: The old cards work because they use balancesArray directly!
  // So instead of complex assignment filtering, use the leave balances directly 
  // which already contain the variants the user can access
  const availableLeaveVariants = balancesArray.map((balance: any) => ({
    id: balance.leaveVariantId,
    leaveTypeName: balance.leaveTypeName,
    leaveVariantName: balance.leaveVariantName,
    leaveTypeId: balance.leaveTypeId || null
  }));
  
  console.log('🔍 [EmployeeOverview] SIMPLIFIED APPROACH - Using balances directly:', {
    balancesCount: balancesArray.length,
    availableVariantsFromBalances: availableLeaveVariants.length,
    sampleBalance: balancesArray[0],
    sampleVariant: availableLeaveVariants[0]
  });

  // EXACT SAME CALCULATION AS LEAVE APPLICATIONS - Total Leaves (Eligibility)
  const totalEligibility = (() => {
    let totalEligibilitySum = 0;
    
    availableLeaveVariants.forEach((variant: any) => {
      const balance = balancesArray.find((b: any) => b.leaveVariantId === variant.id);
      const transactions = Array.isArray(leaveTransactions) ? leaveTransactions.filter((t: any) => t.leaveVariantId === variant.id) : [];
      
      // Calculate opening balance from imported Excel data transactions
      const openingBalanceTransactions = transactions.filter((t: any) => 
        t.transactionType === 'opening_balance' || t.transactionType === 'system'
      );
      const openingBalance = openingBalanceTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
      
      // Get eligibility (entitlement)
      const eligibility = balance ? parseFloat(balance.entitlement || 0) : 0;
      
      // Total eligibility = eligibility + opening balance
      const totalEligibility = eligibility + openingBalance;
      
      totalEligibilitySum += totalEligibility;
    });
    
    return totalEligibilitySum;
  })();

  // EXACT SAME CALCULATION AS LEAVE APPLICATIONS - Total Availed
  const totalAvailed = (() => {
    const allUserTransactions = (leaveTransactions as any[]).filter((t: any) => t.userId === currentUserId);
    
    let totalAvailedfromTxn = 0;
    
    availableLeaveVariants.forEach((variant: any) => {
      const transactionsForVariant = allUserTransactions.filter((t: any) => {
        if (t.leaveVariantId === variant.id) return true;
        const transactionVariant = availableLeaveVariants.find((v: any) => v.id === t.leaveVariantId);
        if (transactionVariant?.leaveTypeName === variant.leaveTypeName) return true;
        if (transactionVariant?.leaveTypeId === variant.leaveTypeId) return true;
        return false;
      });
      
      const leaveTakenTransactions = transactionsForVariant.filter((t: any) => 
        ['leave_taken', 'imported', 'manual_deduction'].includes(t.transactionType) && parseFloat(t.amount || 0) < 0
      );
      
      const variantAvailed = leaveTakenTransactions.reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      totalAvailedfromTxn += variantAvailed;
    });
    
    return totalAvailedfromTxn;
  })();

  // EXACT SAME CALCULATION AS LEAVE APPLICATIONS - Balance
  const totalBalance = (() => {
    let totalClosingBalance = 0;
    
    availableLeaveVariants.forEach((variant: any) => {
      const balance = balancesArray.find((b: any) => b.leaveVariantId === variant.id);
      if (balance) {
        totalClosingBalance += parseFloat(balance.currentBalance || 0);
      }
    });
    
    return totalClosingBalance;
  })();

  // EXACT SAME CALCULATION AS LEAVE APPLICATIONS - Pending Approvals  
  const pendingApprovals = requestsArray.filter((req: any) => req.status === "pending").length;

  // Debug logging - should match Leave Applications exactly
  console.log('🧮 [EmployeeOverview] FIXED CALCULATION RESULTS:', {
    currentUserId,
    availableVariantsCount: availableLeaveVariants.length,
    totalEligibility: totalEligibility.toFixed(1),
    totalAvailed: totalAvailed.toFixed(1),
    totalBalance: totalBalance.toFixed(1),
    pendingApprovals,
    balancesCount: balancesArray.length,
    transactionsCount: leaveTransactions.length,
    sampleVariant: availableLeaveVariants[0],
    sampleBalance: balancesArray[0]
  });

  // Legacy calculations for other metrics
  const totalRequests = leaveRequests.length;
  const approvedLeaves = leaveRequests.filter((req: LeaveRequest) => req.status === 'approved');
  const approvedCount = approvedLeaves.length;
  const pendingCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'pending').length;
  const rejectedCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'rejected').length;

  // Generate chart data for monthly breakdown
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => {
      // Filter for approved leaves only - exclude rejected and pending leaves from usage trends
      const monthRequests = leaveRequests.filter((req: any) => {
        const requestDate = new Date(req.startDate);
        return requestDate.getMonth() === index && 
               requestDate.getFullYear() === parseInt(selectedYear) &&
               req.status === 'approved'; // Only include approved leaves in usage trends
      });

      const monthlyData: any = { month };
      
      // Count by leave type
      leaveBalances.forEach((balance: LeaveBalance) => {
        const typeRequests = monthRequests.filter((req: any) => req.leaveTypeName === balance.leaveTypeName);
        const totalDays = typeRequests.reduce((sum, req) => sum + (parseFloat(req.workingDays?.toString() || '0')), 0);
        if (totalDays > 0) {
          monthlyData[balance.leaveTypeName] = totalDays;
        }
      });

      return monthlyData;
    });
  };

  const monthlyData = generateMonthlyData();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Helper functions
  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const hasLeaveOnDate = (day: number) => {
    const checkDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return approvedLeaves.some((leave: LeaveRequest) => {
      const startDate = leave.startDate.split('T')[0];
      const endDate = leave.endDate.split('T')[0];
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{getMonthName(currentMonth)} {currentYear}</h3>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {dayHeaders.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {Array.from({ length: 42 }, (_, i) => {
            const dayNumber = i - firstDay + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const hasLeave = isCurrentMonth ? hasLeaveOnDate(dayNumber) : false;
            
            if (!isCurrentMonth) {
              return <div key={i} className="h-8"></div>;
            }

            return (
              <div key={i} className="relative h-8 flex items-center justify-center">
                <div className={`w-6 h-6 flex items-center justify-center text-sm rounded ${
                  hasLeave ? 'bg-red-100 text-red-800' : 'text-gray-700'
                }`}>
                  {dayNumber}
                </div>
                {hasLeave && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-red-500 rounded text-xs text-white text-center leading-none">
                    Leave
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (leaveLoading || balanceLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-24 rounded"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-96 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* FORCE UPDATE: Change the entire layout structure to ensure update */}
      <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
        🚨 NEW ANALYTICS DESIGN - FORCED UPDATE
      </div>
      {/* Applications Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Applications</h2>
          <div className="flex gap-2">
            <Badge variant="secondary">Leaves ({totalRequests})</Badge>
            <Badge variant="secondary">BTO ({ptoRequests.length})</Badge>
            <Badge variant="secondary">Comp-off ({compOffRequests.length})</Badge>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex gap-2 mb-4 text-sm">
          <Button variant="ghost" size="sm" className="text-blue-600 border-b-2 border-blue-600">All</Button>
          <Button variant="ghost" size="sm">Pending ({pendingCount})</Button>
          <Button variant="ghost" size="sm">Approved ({approvedCount})</Button>
          <Button variant="ghost" size="sm">Rejected ({rejectedCount})</Button>
          <Button variant="ghost" size="sm">Availed</Button>
          <Button variant="link" size="sm" className="ml-auto text-blue-600">View All →</Button>
        </div>

        {/* Applications Table */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium">Leave type</th>
                    <th className="text-left p-4 font-medium">Date of request</th>
                    <th className="text-left p-4 font-medium">Leave period</th>
                    <th className="text-left p-4 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.slice(0, 3).map((request: LeaveRequest, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4">{request.leaveTypeId || 'Casual'}</td>
                      <td className="p-4">{new Date(request.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="p-4">
                        {new Date(request.startDate).toLocaleDateString('en-GB')} - {new Date(request.endDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-4">{request.reason || 'Wedding'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Analytics</h2>
          <div className="flex gap-2">
            <Badge variant="secondary">Leaves</Badge>
            <Badge variant="outline">BTO</Badge>
            <Badge variant="outline">Comp-off</Badge>
          </div>
        </div>

        {/* Analytics Tabs */}
        <div className="flex gap-2 mb-4 text-sm border-b">
          <Button variant="ghost" size="sm" className="text-blue-600 border-b-2 border-blue-600">Availed</Button>
          <Button variant="ghost" size="sm">Rejected</Button>
          <Button variant="ghost" size="sm">Loss of Pay</Button>
          <Button variant="ghost" size="sm">Absent</Button>
          <Button variant="ghost" size="sm">Encashment</Button>
        </div>

        {/* Chart and Stats */}
        <div className="grid grid-cols-12 gap-6">
          {/* Chart */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Leaves availed: {totalAvailed.toFixed(1)}</h3>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  {leaveBalances.map((balance: LeaveBalance, index) => (
                    <Bar 
                      key={balance.leaveTypeName}
                      dataKey={balance.leaveTypeName}
                      stackId="leaves"
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              {leaveBalances.map((balance: LeaveBalance, index) => (
                <div key={balance.leaveTypeName} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span>{balance.leaveTypeName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="col-span-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-600">{totalEligibility.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Total Leaves</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-red-600">{totalAvailed.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Total Availed</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-green-600">{totalBalance.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Balance</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-orange-600">{pendingApprovals}</div>
                <div className="text-sm text-gray-600">Pending Approvals</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-sm text-gray-600">Total Rejected</div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-gray-600">0</div>
                <div className="text-sm text-gray-600">Absent</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-yellow-600">0</div>
                <div className="text-sm text-gray-600">Total Loss of Pay</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-indigo-600">0</div>
                <div className="text-sm text-gray-600">Total lapsed</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-teal-600">0</div>
                <div className="text-sm text-gray-600">Total Encashed</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-pink-600">{Math.round(totalBalance)}</div>
                <div className="text-sm text-gray-600">Carry forward</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {renderCalendar()}
        </CardContent>
      </Card>
    </div>
  );
}
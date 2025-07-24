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
  leaveTypeName: string;
  leaveVariantName: string;
}

export default function NewEmployeeOverview() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem('user_id') || '2161';
  
  console.log('[NewEmployeeOverview] Loading component for user:', currentUserId);

  // Fetch leave requests with proper typing
  const { data: leaveRequestsData = [], isLoading: leaveLoading } = useQuery({
    queryKey: [`/api/leave-requests?userId=${currentUserId}`],
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch leave balances with proper typing
  const { data: leaveBalancesData = [], isLoading: balanceLoading } = useQuery({
    queryKey: [`/api/employee-leave-balances/${currentUserId}`],
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch PTO and Comp-off data
  const { data: ptoRequestsData = [] } = useQuery({
    queryKey: [`/api/pto-requests?userId=${currentUserId}`],
    staleTime: 0
  });

  const { data: compOffRequestsData = [] } = useQuery({
    queryKey: [`/api/comp-off-requests?userId=${currentUserId}`],
    staleTime: 0
  });

  // Fetch leave transactions for trends chart
  const { data: leaveTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
    staleTime: 0
  });

  // Type the arrays properly
  const leaveRequests = leaveRequestsData as LeaveRequest[];
  const leaveBalances = leaveBalancesData as LeaveBalance[];
  const ptoRequests = ptoRequestsData as any[];
  const compOffRequests = compOffRequestsData as any[];
  const transactions = leaveTransactions as any[];

  // Calculate statistics
  const totalRequests = leaveRequests.length;
  const approvedLeaves = leaveRequests.filter((req: LeaveRequest) => req.status === 'approved');
  const approvedCount = approvedLeaves.length;
  const pendingCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'pending').length;
  const rejectedCount = leaveRequests.filter((req: LeaveRequest) => req.status === 'rejected').length;

  // Calculate total working days availed
  const totalAvailed = approvedLeaves.reduce((sum: number, req: LeaveRequest) => {
    const days = req.workingDays ? parseFloat(req.workingDays.toString()) : 0;
    return sum + (isNaN(days) ? 0 : days);
  }, 0);

  // Debug approved leaves for calendar
  console.log('[NewEmployeeOverview] Approved leaves for calendar:', approvedLeaves.map(l => ({ id: l.id, startDate: l.startDate, endDate: l.endDate })));

  // Calculate total balance
  const totalBalance = leaveBalances.reduce((sum: number, balance: LeaveBalance) => {
    const balance_val = balance.currentBalance ? parseFloat(balance.currentBalance.toString()) / 2 : 0;
    return sum + (isNaN(balance_val) ? 0 : balance_val);
  }, 0);

  // Calculate total entitlement
  const totalEntitlement = leaveBalances.reduce((sum: number, balance: LeaveBalance) => {
    const entitlement_val = balance.entitlement ? parseFloat(balance.entitlement.toString()) / 2 : 0;
    return sum + (isNaN(entitlement_val) ? 0 : entitlement_val);
  }, 0);

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
            dayClasses += 'bg-green-100 text-green-800 font-medium';
            break;
          case 'pending':
            dayClasses += 'bg-orange-100 text-orange-800 font-medium';
            break;
          case 'rejected':
            dayClasses += 'bg-red-100 text-red-800 font-medium';
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

  if (leaveLoading || balanceLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
                <p className="text-3xl font-bold text-gray-900">{Math.round(totalEntitlement) || 0}</p>
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
                <p className="text-3xl font-bold text-gray-900">{Math.round(totalAvailed) || 0}</p>
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
                <p className="text-3xl font-bold text-gray-900">{Math.round(totalBalance) || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Applications Section */}
        <div className="xl:col-span-2 space-y-6">
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
                  <TabsTrigger value="pto">PTO ({ptoRequests.length})</TabsTrigger>
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
                    {ptoRequests.length === 0 ? 'No PTO requests found' : `${ptoRequests.length} PTO requests`}
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

          {/* Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Bar dataKey="usage" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Debug Chart Data */}
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                <p className="font-medium mb-2">Chart Debug Data:</p>
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

        {/* Calendar Section */}
        <div className="space-y-6">
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
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span className="text-gray-600">Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 rounded"></div>
                    <span className="text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-100 rounded"></div>
                    <span className="text-gray-600">Rejected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveBalances.map((balance: LeaveBalance, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{balance.leaveTypeName}</p>
                      <p className="text-sm text-gray-500">{balance.leaveVariantName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{Math.round(balance.currentBalance / 2)}</p>
                      <p className="text-sm text-gray-500">days</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
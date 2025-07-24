import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Filter, BarChart3, PieChart, TrendingUp, Users, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import { useParams } from "wouter";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";

export default function EmployeeReports() {
  const params = useParams();
  const reportType = params.reportType || "dashboard";
  
  // Use external employee data hook
  const { employees: externalEmployees } = useExternalEmployeeData();

  // Helper function to get current employee name
  const getCurrentEmployeeName = () => {
    const currentUserId = localStorage.getItem('user_id') || '2161';
    
    // Try external API data first
    const externalEmployee = externalEmployees.find(emp => 
      emp.user_id?.toString() === currentUserId || emp.user_id === parseInt(currentUserId, 10)
    );
    
    if (externalEmployee && externalEmployee.user_name) {
      return externalEmployee.user_name;
    }
    
    if (externalEmployee && (externalEmployee.first_name || externalEmployee.last_name)) {
      const name = `${externalEmployee.first_name || ''} ${externalEmployee.last_name || ''}`.trim();
      if (name) return name;
    }
    
    return `Employee ${currentUserId}`;
  };
  
  // Map URL params to report types
  const mapReportType = (type: string) => {
    switch (type) {
      case "dashboard": return "my-leave-summary";
      case "history": return "my-leave-history";
      case "balances": return "my-leave-balances";  
      case "withdrawal-history": return "my-withdrawal-history";
      default: return "my-leave-summary";
    }
  };
  
  const [selectedReport, setSelectedReport] = useState(mapReportType(reportType));
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedLeaveType, setSelectedLeaveType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Update selected report when URL changes
  useEffect(() => {
    setSelectedReport(mapReportType(reportType));
  }, [reportType]);

  const currentUserId = localStorage.getItem('user_id') || '2161';

  // Fetch data for reports - filtered to current employee only
  const { data: myLeaveRequests = [] } = useQuery({
    queryKey: [`/api/leave-requests?userId=${currentUserId}`],
  });

  const { data: myLeaveBalances = [] } = useQuery({
    queryKey: [`/api/employee-leave-balances/${currentUserId}`],
  });

  const { data: myTransactions = [] } = useQuery({
    queryKey: [`/api/leave-balance-transactions/${currentUserId}`],
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  // Report calculations for current employee
  const getMyLeaveStats = () => {
    const allRequests = (myLeaveRequests as any[]) || [];

    return {
      totalRequests: allRequests.length,
      approvedRequests: allRequests.filter((req: any) => req.status === "approved").length,
      pendingRequests: allRequests.filter((req: any) => req.status === "pending" || req.status === "approval_pending").length,
      rejectedRequests: allRequests.filter((req: any) => req.status === "rejected").length,
      totalDaysTaken: allRequests.reduce((sum: number, req: any) => sum + (parseFloat(req.workingDays) || parseFloat(req.totalDays) || 0), 0),
    };
  };

  const getMyLeaveTypeUsage = () => {
    const usage: Record<string, { days: number, requests: number }> = {};
    (myLeaveRequests as any[]).forEach((req: any) => {
      const leaveType = (leaveTypes as any[]).find((type: any) => type.id === req.leaveTypeId);
      const typeName = leaveType?.name || "Unknown Leave Type";
      if (!usage[typeName]) {
        usage[typeName] = { days: 0, requests: 0 };
      }
      usage[typeName].days += parseFloat(req.workingDays) || parseFloat(req.totalDays) || 0;
      usage[typeName].requests += 1;
    });
    
    return Object.entries(usage).map(([name, data]) => ({
      name,
      ...data
    }));
  };

  const getMyBalanceData = () => {
    return (myLeaveBalances as any[]).map((balance: any) => {
      const variant = (leaveVariants as any[]).find((v: any) => v.id === balance.leaveVariantId);
      const leaveType = (leaveTypes as any[]).find((type: any) => type.id === variant?.leaveTypeId);
      
      // Convert half-day units to full days for display
      const entitlement = (balance.entitlement || 0) / 2;
      const usedBalance = (balance.usedBalance || 0) / 2;
      const carryForward = (balance.carryForward || 0) / 2;
      const currentBalance = (balance.currentBalance || 0) / 2;
      
      return {
        leaveType: leaveType?.name || variant?.leaveTypeName || 'Unknown',
        entitlement: entitlement,
        used: usedBalance,
        carryForward: carryForward,
        available: currentBalance,
        year: balance.year || new Date().getFullYear()
      };
    });
  };

  const getFilteredRequests = () => {
    let filtered = (myLeaveRequests as any[]) || [];
    
    if (selectedLeaveType !== "all") {
      filtered = filtered.filter((req: any) => {
        const leaveType = (leaveTypes as any[]).find((type: any) => type.id === req.leaveTypeId);
        return leaveType?.name === selectedLeaveType;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter((req: any) => 
        req.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getWithdrawalRequests = () => {
    return (myLeaveRequests as any[]).filter((req: any) => 
      req.status === 'withdrawal_pending' || req.status === 'withdrawn'
    );
  };

  const myStats = getMyLeaveStats();
  const myUsage = getMyLeaveTypeUsage();
  const myBalances = getMyBalanceData();
  const filteredRequests = getFilteredRequests();
  const withdrawalRequests = getWithdrawalRequests();

  // Debug the current state
  console.log('=== EMPLOYEE REPORTS DEBUG ===');
  console.log('URL reportType:', reportType);
  console.log('selectedReport:', selectedReport);
  console.log('localStorage user_id:', localStorage.getItem('user_id'));
  console.log('currentUserId variable:', currentUserId);
  console.log('myLeaveRequests length:', (myLeaveRequests as any[]).length);
  console.log('myLeaveBalances length:', (myLeaveBalances as any[]).length);
  console.log('myStats:', myStats);
  console.log('================================');

  const exportData = () => {
    const dataToExport = {
      employeeName: getCurrentEmployeeName(),
      employeeId: currentUserId,
      reportType: selectedReport,
      dateRange: dateRange,
      data: selectedReport === 'my-leave-balances' ? myBalances : 
            selectedReport === 'my-withdrawal-history' ? withdrawalRequests : 
            filteredRequests
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${getCurrentEmployeeName()}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{myStats.approvedRequests}</div>
            <p className="text-xs text-muted-foreground">Successful requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{myStats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Taken</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{myStats.totalDaysTaken.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Total leave days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Type Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>My Leave Usage by Type</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myUsage.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.requests} requests</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{item.days.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaveHistory = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by reason or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {(leaveTypes as any[]).map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Leave History Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Applied</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>From - To</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request: any) => {
                const leaveType = (leaveTypes as any[]).find((type: any) => type.id === request.leaveTypeId);
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.appliedDate || request.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{leaveType?.name || 'Unknown'}</TableCell>
                    <TableCell>{request.totalDays} days</TableCell>
                    <TableCell>
                      {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{request.workingDays} days</TableCell>
                    <TableCell>
                      <Badge variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || 'No reason provided'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaveBalances = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>My Leave Balances</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">
              Employee: <span className="font-medium">{getCurrentEmployeeName()}</span> | 
              Year: <span className="font-medium">{selectedYear}</span>
            </p>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Entitlement</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Carry Forward</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Utilization %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myBalances.map((balance: any, index: number) => {
                const utilizationRate = balance.entitlement > 0 ? (balance.used / balance.entitlement) * 100 : 0;
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{balance.leaveType}</TableCell>
                    <TableCell>{balance.entitlement.toFixed(1)}</TableCell>
                    <TableCell>{balance.used.toFixed(1)}</TableCell>
                    <TableCell>{balance.carryForward.toFixed(1)}</TableCell>
                    <TableCell className="font-medium">{balance.available.toFixed(1)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        utilizationRate > 80 ? 'text-red-600' : 
                        utilizationRate > 60 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {utilizationRate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderWithdrawalHistory = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">
              Employee: <span className="font-medium">{getCurrentEmployeeName()}</span>
            </p>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original Request</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Withdrawal Date</TableHead>
                <TableHead>Withdrawal Status</TableHead>
                <TableHead>Withdrawal Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalRequests.map((request: any) => {
                const leaveType = (leaveTypes as any[]).find((type: any) => type.id === request.leaveTypeId);
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{leaveType?.name || 'Unknown'}</TableCell>
                    <TableCell>{request.workingDays} days</TableCell>
                    <TableCell>
                      {request.withdrawalDate ? format(new Date(request.withdrawalDate), 'MMM dd, yyyy') : 'Pending'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        request.status === 'withdrawn' ? 'default' : 
                        request.status === 'withdrawal_pending' ? 'secondary' : 
                        'destructive'
                      }>
                        {request.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.withdrawalReason || 'No reason provided'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {withdrawalRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No withdrawal requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Employee Reports</h1>
          <p className="text-muted-foreground">
            View your personal leave data and history
          </p>
        </div>

        {/* Report Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedReport === "my-leave-summary" ? "default" : "outline"}
              onClick={() => setSelectedReport("my-leave-summary")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              My Dashboard
            </Button>
            <Button
              variant={selectedReport === "my-leave-history" ? "default" : "outline"}
              onClick={() => setSelectedReport("my-leave-history")}
            >
              <FileText className="h-4 w-4 mr-2" />
              My Leave History
            </Button>
            <Button
              variant={selectedReport === "my-leave-balances" ? "default" : "outline"}
              onClick={() => setSelectedReport("my-leave-balances")}
            >
              <PieChart className="h-4 w-4 mr-2" />
              My Leave Balances
            </Button>
            <Button
              variant={selectedReport === "my-withdrawal-history" ? "default" : "outline"}
              onClick={() => setSelectedReport("my-withdrawal-history")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              My Withdrawal History
            </Button>
          </div>
        </div>

        {/* Report Content */}
        {selectedReport === "my-leave-summary" && renderDashboard()}
        {selectedReport === "my-leave-history" && renderLeaveHistory()}
        {selectedReport === "my-leave-balances" && renderLeaveBalances()}
        {selectedReport === "my-withdrawal-history" && renderWithdrawalHistory()}
      </div>
    </Layout>
  );
}
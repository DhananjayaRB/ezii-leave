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
      case "history": return "my-leave-history";
      case "balances": return "my-leave-balances";  
      case "withdrawal-history": return "my-withdrawal-history";
      default: return "my-leave-history";
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

  // Fetch employee assignments to determine which leave variants this user can access (same as LeaveApplications)
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  // Report calculations for current employee

  const getMyBalanceData = () => {
    // Use EXACT SAME filtering logic as LeaveApplications.tsx
    const assignmentsArray = Array.isArray(allAssignments) ? allAssignments : [];
    const variantsArray = Array.isArray(leaveVariants) ? leaveVariants : [];
    const balancesArray = (myLeaveBalances as any[]) || [];
    const transactionsArray = (myTransactions as any[]) || [];
    const requestsArray = (myLeaveRequests as any[]) || [];
    
    // Filter user assignments and available leave variants (EXACT same logic as LeaveApplications)
    const userAssignments = assignmentsArray.filter(
      (assignment: any) => assignment.userId === currentUserId && assignment.assignmentType === 'leave_variant'
    );
    
    const assignedVariantIds = userAssignments.map((assignment: any) => assignment.leaveVariantId);
    
    const availableLeaveVariants = variantsArray.filter(
      (variant: any) => assignedVariantIds.includes(variant.id)
    );
    
    console.log('🔍 [Employee Reports Assignment Filter]:', {
      userId: currentUserId,
      totalAssignments: assignmentsArray.length,
      userAssignments: userAssignments.length,
      assignedVariantIds,
      availableVariants: availableLeaveVariants.length,
      variantNames: availableLeaveVariants.map((v: any) => v.leaveVariantName || v.leaveTypeName)
    });
    
    return availableLeaveVariants.map((variant: any) => {
      const balance = balancesArray.find((b: any) => b.leaveVariantId === variant.id);
      const transactions = transactionsArray.filter((t: any) => t.leaveVariantId === variant.id);
      
      // Calculate opening balance from imported Excel data transactions (same logic as LeaveApplications)
      const openingBalanceTransactions = transactionsArray
        .filter((t: any) => {
          const isOpeningBalance = t.transactionType === 'grant' && 
                                 t.description?.toLowerCase().includes('opening balance imported from excel');
          const isForCurrentUser = t.userId === currentUserId;
          
          if (!isOpeningBalance || !isForCurrentUser) return false;
          
          // Direct variant match (preferred)
          if (t.leaveVariantId === variant.id) return true;
          
          // Cross-reference by leave type
          const transactionVariant = availableLeaveVariants.find((v: any) => v.id === t.leaveVariantId);
          if (transactionVariant?.leaveTypeName === variant.leaveTypeName) return true;
          if (transactionVariant?.leaveTypeId === variant.leaveTypeId) return true;
          
          return false;
        })
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const openingBalance = openingBalanceTransactions.reduce((sum: number, t: any) => 
        sum + parseFloat(t.amount || '0'), 0);
      
      // Calculate eligibility based on leave grant method (same logic as LeaveApplications)
      const isAfterEarning = variant.grantLeaves === 'after_earning';
      const totalEntitlementInDays = balance ? parseFloat(balance.totalEntitlement || '0') : 0;
      
      let eligibility = 0;
      
      if (isAfterEarning) {
        // "After Earning" - calculate based on annual entitlement and months completed
        const currentMonth = new Date().getMonth() + 1;
        const monthsCompleted = currentMonth - 1;
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;
        eligibility = (annualEntitlement / 12) * monthsCompleted;
      } else {
        // "In Advance" - check grant frequency
        const annualEntitlement = totalEntitlementInDays || variant.annualLeaveAllocation || 0;
        
        if (variant.grantFrequency === 'per_year') {
          eligibility = annualEntitlement;
        } else {
          const currentMonth = new Date().getMonth() + 1;
          eligibility = (annualEntitlement / 12) * currentMonth;
        }
      }
      
      const totalEligibility = eligibility + openingBalance;
      
      // Calculate availed using same logic as LeaveApplications
      const isBeforeWorkflow = variant.leaveBalanceDeductionBefore === true;
      
      // Match requests to variant (handle null leaveVariantId)
      const matchingRequests = requestsArray.filter((req: any) => 
        req.leaveVariantId === variant.id || 
        ((req.leaveVariantId === null || req.leaveVariantId === undefined) && req.leaveTypeId === variant.leaveTypeId)
      );
      
      // Count approved requests
      const approvedRequests = matchingRequests.filter((req: any) => req.status === 'approved');
      const approvedDays = approvedRequests.reduce((sum: number, req: any) => 
        sum + parseFloat(req.workingDays || '0'), 0);
      
      // For "Before Workflow" types, add pending requests
      let pendingDays = 0;
      if (isBeforeWorkflow) {
        const pendingRequests = matchingRequests.filter((req: any) => req.status === 'pending');
        pendingDays = pendingRequests.reduce((sum: number, req: any) => 
          sum + parseFloat(req.workingDays || '0'), 0);
      }
      
      // Add imported leave usage from Excel
      const importedAvailed = transactions.filter((t: any) => 
        t.description?.toLowerCase().includes('imported leave transaction') && 
        t.description?.toLowerCase().includes('availed') &&
        (t.transactionType === 'deduction' || t.transactionType === 'debit')
      ).reduce((sum: number, t: any) => 
        sum + Math.abs(parseFloat(t.amount || '0')), 0);
      
      const totalAvailed = approvedDays + pendingDays + importedAvailed;
      const closingBalance = totalEligibility - totalAvailed;
      
      return {
        leaveType: variant.leaveTypeName || variant.leaveVariantName || 'Unknown',
        entitlement: eligibility,
        used: totalAvailed,
        carryForward: openingBalance,
        available: closingBalance,
        year: new Date().getFullYear()
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
        {selectedReport === "my-leave-history" && renderLeaveHistory()}
        {selectedReport === "my-leave-balances" && renderLeaveBalances()}
        {selectedReport === "my-withdrawal-history" && renderWithdrawalHistory()}
      </div>
    </Layout>
  );
}
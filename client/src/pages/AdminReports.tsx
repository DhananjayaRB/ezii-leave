import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
// import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import { useParams } from "wouter";
import { useReportingManagerData } from "@/hooks/useReportingManagerData";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";

export default function AdminReports() {
  const params = useParams();
  const reportType = params.reportType || "dashboard";

  // Get reporting manager data for filtering
  const reportingManagerData = useReportingManagerData();

  // Use the same working hook as HR Leave Balance Report
  const {
    employees: externalEmployees,
    loading: isLoadingEmployees,
    error: employeeError,
  } = useExternalEmployeeData();

  // Helper function to get employee name
  const getEmployeeName = (userId: string) => {
    if (!userId) return "Unknown Employee";

    // First try external API data - check both string and number matching
    const externalEmployee = externalEmployees.find(
      (emp) =>
        emp.user_id?.toString() === userId ||
        emp.user_id === parseInt(userId, 10),
    );

    if (externalEmployee && externalEmployee.user_name) {
      return externalEmployee.user_name;
    }

    if (
      externalEmployee &&
      (externalEmployee.first_name || externalEmployee.last_name)
    ) {
      const name =
        `${externalEmployee.first_name || ""} ${externalEmployee.last_name || ""}`.trim();
      if (name) return name;
    }

    // Fallback when no external data available
    return `Employee ${userId}`;
  };

  // Map URL params to report types
  const mapReportType = (type: string) => {
    switch (type) {
      case "balances":
        return "balance-report";
      case "leave-availed":
        return "leave-availed-report";
      case "withdrawal-rejection":
        return "withdrawal-rejection-report";
      case "collaborative-leave":
        return "collaborative-leave-report";
      case "bto-report":
        return "bto-report";
      case "comp-off-report":
        return "comp-off-report";
      default:
        return "balance-report";
    }
  };

  const [selectedReport, setSelectedReport] = useState(
    mapReportType(reportType),
  );
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  });
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLeaveType, setSelectedLeaveType] = useState("all");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("all");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState("");

  // BTO Report filters
  const [btoEmployeeFilter, setBtoEmployeeFilter] = useState("");
  const [btoStatusFilter, setBtoStatusFilter] = useState("all");
  const [btoDateFilter, setBtoDateFilter] = useState("all");
  const [btoTypeFilter, setBtoTypeFilter] = useState("all");

  // Comp-off Report filters
  const [compOffEmployeeFilter, setCompOffEmployeeFilter] = useState("");
  const [compOffStatusFilter, setCompOffStatusFilter] = useState("all");
  const [compOffDateFilter, setCompOffDateFilter] = useState("all");
  const [compOffTypeFilter, setCompOffTypeFilter] = useState("all");

  // Update selected report when URL changes
  useEffect(() => {
    setSelectedReport(mapReportType(reportType));
  }, [reportType]);

  // Check current view mode to prevent data fetching in employee view
  const currentView = localStorage.getItem("currentView") || "admin";

  // Fetch data for reports - only when in admin view
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: currentView === "admin", // Only fetch when in admin view
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["/api/employee-leave-balances"],
  });

  const { data: leaveVariants = [] } = useQuery({
    queryKey: ["/api/leave-variants"],
  });

  const { data: employeeAssignments = [] } = useQuery({
    queryKey: ["/api/employee-assignments"],
  });

  // Fetch collaborative tasks data for collaborative leave report
  const { data: collaborativeTasks = [] } = useQuery({
    queryKey: ["/api/collaborative-tasks"],
    enabled:
      currentView === "admin" &&
      selectedReport === "collaborative-leave-report",
  });

  // Fetch BTO and Comp-off data for reports
  const { data: btoRequests = [] } = useQuery({
    queryKey: ["/api/pto-requests"],
    enabled: currentView === "admin",
  });

  const { data: compOffRequests = [] } = useQuery({
    queryKey: ["/api/comp-off-requests"],
    enabled: currentView === "admin",
  });

  const { data: btoVariants = [] } = useQuery({
    queryKey: ["/api/pto-variants"],
    enabled: currentView === "admin",
  });

  // Apply reporting manager filtering to data
  const getFilteredData = () => {
    let filteredRequests = (leaveRequests as any[]) || [];
    let filteredEmployees = (employees as any[]) || [];

    if (
      reportingManagerData.isReportingManager &&
      reportingManagerData.reportees.length > 0
    ) {
      // User is a reporting manager - filter to show only data for their reportees
      const reporteeIds = reportingManagerData.reportees.map((r) =>
        r.user_id.toString(),
      );

      filteredRequests = filteredRequests.filter((req) =>
        reporteeIds.includes(req.userId?.toString()),
      );

      filteredEmployees = filteredEmployees.filter((emp) =>
        reporteeIds.includes(emp.id?.toString()),
      );

      console.log(
        `[AdminReports] Filtered to ${filteredRequests.length} requests and ${filteredEmployees.length} employees for reporting manager`,
      );
    } else {
      console.log(
        `[AdminReports] Showing all ${filteredRequests.length} requests and ${filteredEmployees.length} employees`,
      );
    }

    return { filteredRequests, filteredEmployees };
  };

  // Report calculations
  const getLeaveStats = () => {
    const { filteredRequests } = getFilteredData();
    const allRequests = filteredRequests;

    const totalRequests = allRequests.length;
    const approvedRequests = allRequests.filter(
      (req: any) => req.status === "approved",
    ).length;
    const pendingRequests = allRequests.filter(
      (req: any) => req.status === "pending",
    ).length;
    const rejectedRequests = allRequests.filter(
      (req: any) => req.status === "rejected",
    ).length;

    const totalDaysTaken = allRequests
      .filter((req: any) => req.status === "approved")
      .reduce(
        (sum: number, req: any) => sum + (parseFloat(req.workingDays) || 0),
        0,
      );

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      totalDaysTaken,
    };
  };

  const renderReportContent = () => {
    const stats = getLeaveStats();
    const { filteredRequests } = getFilteredData();

    switch (selectedReport) {
      case "leave-availed-report":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Leave Availed Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed report of all approved leave applications with
                comprehensive employee and leave details
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">
                        Employee Number
                      </TableHead>
                      <TableHead className="font-semibold">
                        Employee Name
                      </TableHead>
                      <TableHead className="font-semibold">
                        Department
                      </TableHead>
                      <TableHead className="font-semibold">
                        Designation
                      </TableHead>
                      <TableHead className="font-semibold">
                        Application ID
                      </TableHead>
                      <TableHead className="font-semibold">From Date</TableHead>
                      <TableHead className="font-semibold">
                        From Date: Is Half Day
                      </TableHead>
                      <TableHead className="font-semibold">To Date</TableHead>
                      <TableHead className="font-semibold">
                        To Date: Is Half Day
                      </TableHead>
                      <TableHead className="font-semibold">
                        Total Leave Days
                      </TableHead>
                      <TableHead className="font-semibold">
                        Approved By
                      </TableHead>
                      <TableHead className="font-semibold">
                        Leave Type
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Filter only approved leave requests
                      const approvedRequests = filteredRequests.filter(
                        (req: any) => req.status === "approved",
                      );

                      if (approvedRequests.length === 0) {
                        return (
                          <TableRow>
                            <TableCell
                              colSpan={12}
                              className="py-8 px-4 text-center text-muted-foreground"
                            >
                              No approved leave requests found for the selected
                              period
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return approvedRequests.map(
                        (request: any, index: number) => {
                          // Get employee details from external API
                          const externalEmployee = externalEmployees.find(
                            (emp) =>
                              emp.user_id?.toString() === request.userId ||
                              emp.user_id === parseInt(request.userId, 10),
                          );

                          const employeeNumber =
                            externalEmployee?.employee_number || request.userId;
                          const employeeName = getEmployeeName(request.userId);
                          const department =
                            externalEmployee?.department || "N/A";
                          const designation =
                            externalEmployee?.designation || "N/A";

                          // Format dates
                          const fromDate = request.startDate
                            ? format(new Date(request.startDate), "dd-MMM-yyyy")
                            : "N/A";
                          const toDate = request.endDate
                            ? format(new Date(request.endDate), "dd-MMM-yyyy")
                            : "N/A";

                          // Determine half day status (assuming half day if working days contains .5)
                          const workingDays =
                            parseFloat(request.workingDays) || 0;
                          const isFromHalfDay =
                            request.fromHalfDay ||
                            (workingDays % 1 !== 0 ? "Yes" : "No");
                          const isToHalfDay =
                            request.toHalfDay ||
                            (workingDays % 1 !== 0 &&
                            request.startDate === request.endDate
                              ? "Yes"
                              : "No");

                          // Get approved by information (you may need to add this field to your leave requests schema)
                          const approvedBy =
                            request.approvedByName ||
                            request.approvedBy ||
                            "System Auto-Approval";

                          return (
                            <TableRow
                              key={`leave-${request.id}-${index}`}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <TableCell className="font-medium">
                                {employeeNumber}
                              </TableCell>
                              <TableCell>{employeeName}</TableCell>
                              <TableCell>{department}</TableCell>
                              <TableCell>{designation}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {request.id}
                                </Badge>
                              </TableCell>
                              <TableCell>{fromDate}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    isFromHalfDay === "Yes"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {isFromHalfDay}
                                </Badge>
                              </TableCell>
                              <TableCell>{toDate}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    isToHalfDay === "Yes"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {isToHalfDay}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className="font-semibold"
                                >
                                  {workingDays} days
                                </Badge>
                              </TableCell>
                              <TableCell>{approvedBy}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800"
                                >
                                  {request.leaveTypeName ||
                                    "Unknown Leave Type"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        },
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">
                    Total Applications
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {
                      filteredRequests.filter(
                        (req: any) => req.status === "approved",
                      ).length
                    }
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">
                    Total Days Availed
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {filteredRequests
                      .filter((req: any) => req.status === "approved")
                      .reduce(
                        (sum: number, req: any) =>
                          sum + (parseFloat(req.workingDays) || 0),
                        0,
                      )
                      .toFixed(1)}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">
                    Unique Employees
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {
                      new Set(
                        filteredRequests
                          .filter((req: any) => req.status === "approved")
                          .map((req: any) => req.userId),
                      ).size
                    }
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">
                    Avg Days per Application
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {(() => {
                      const approvedReqs = filteredRequests.filter(
                        (req: any) => req.status === "approved",
                      );
                      const totalDays = approvedReqs.reduce(
                        (sum: number, req: any) =>
                          sum + (parseFloat(req.workingDays) || 0),
                        0,
                      );
                      return approvedReqs.length > 0
                        ? (totalDays / approvedReqs.length).toFixed(1)
                        : "0.0";
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "withdrawal-rejection-report":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Rejection Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive report of all withdrawn and rejected leave
                applications with balance impact analysis
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">
                        Employee Number
                      </TableHead>
                      <TableHead className="font-semibold">
                        Employee Name
                      </TableHead>
                      <TableHead className="font-semibold">
                        Department
                      </TableHead>
                      <TableHead className="font-semibold">
                        Designation
                      </TableHead>
                      <TableHead className="font-semibold">
                        Application ID
                      </TableHead>
                      <TableHead className="font-semibold">
                        Application Date
                      </TableHead>
                      <TableHead className="font-semibold">
                        Leave Period
                      </TableHead>
                      <TableHead className="font-semibold">
                        Total Leave Days
                      </TableHead>
                      <TableHead className="font-semibold">
                        Leave Type
                      </TableHead>
                      <TableHead className="font-semibold">
                        Status Before Action
                      </TableHead>
                      <TableHead className="font-semibold">
                        Balance Before Action
                      </TableHead>
                      <TableHead className="font-semibold">Action</TableHead>
                      <TableHead className="font-semibold">
                        Balance After Action
                      </TableHead>
                      <TableHead className="font-semibold">
                        Action Initiated By
                      </TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Filter for withdrawn and rejected requests
                      const targetRequests = filteredRequests.filter(
                        (req: any) =>
                          req.status === "withdrawn" ||
                          req.status === "rejected" ||
                          req.status === "withdrawal_pending" ||
                          req.status === "withdrawal_approved",
                      );

                      if (targetRequests.length === 0) {
                        return (
                          <TableRow>
                            <TableCell
                              colSpan={15}
                              className="py-8 px-4 text-center text-muted-foreground"
                            >
                              No withdrawn or rejected leave requests found for
                              the selected period
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return targetRequests.map(
                        (request: any, index: number) => {
                          // Get employee details from external API
                          const externalEmployee = externalEmployees.find(
                            (emp) =>
                              emp.user_id?.toString() === request.userId ||
                              emp.user_id === parseInt(request.userId, 10),
                          );

                          const employeeNumber =
                            externalEmployee?.employee_number || request.userId;
                          const employeeName = getEmployeeName(request.userId);
                          const department =
                            externalEmployee?.department || "N/A";
                          const designation =
                            externalEmployee?.designation || "N/A";

                          // Format dates
                          const applicationDate = request.createdAt
                            ? format(new Date(request.createdAt), "dd-MMM-yyyy")
                            : "N/A";
                          const fromDate = request.startDate
                            ? format(new Date(request.startDate), "dd-MMM-yyyy")
                            : "N/A";
                          const toDate = request.endDate
                            ? format(new Date(request.endDate), "dd-MMM-yyyy")
                            : "N/A";
                          const leavePeriod =
                            fromDate === toDate
                              ? fromDate
                              : `${fromDate} to ${toDate}`;

                          // Working days
                          const workingDays =
                            parseFloat(request.workingDays) || 0;

                          // Determine status before action and action taken
                          let statusBeforeAction = "pending";
                          let actionTaken = "Unknown";
                          let actionInitiatedBy = "System";
                          let reason =
                            request.rejectionReason ||
                            request.withdrawalReason ||
                            "No reason provided";

                          switch (request.status) {
                            case "rejected":
                              statusBeforeAction = "pending";
                              actionTaken = "Rejected";
                              actionInitiatedBy =
                                request.rejectedBy ||
                                request.actionBy ||
                                "Admin";
                              reason =
                                request.rejectionReason || "No reason provided";
                              break;
                            case "withdrawn":
                              statusBeforeAction =
                                request.previousStatus || "pending";
                              actionTaken = "Withdrawn";
                              actionInitiatedBy =
                                request.withdrawnBy ||
                                employeeName ||
                                "Employee";
                              reason =
                                request.withdrawalReason ||
                                "Employee initiated withdrawal";
                              break;
                            case "withdrawal_pending":
                              statusBeforeAction = "approved";
                              actionTaken = "Withdrawal Requested";
                              actionInitiatedBy =
                                request.withdrawnBy ||
                                employeeName ||
                                "Employee";
                              reason =
                                request.withdrawalReason ||
                                "Employee requested withdrawal";
                              break;
                            case "withdrawal_approved":
                              statusBeforeAction = "approved";
                              actionTaken = "Withdrawal Approved";
                              actionInitiatedBy =
                                request.withdrawalApprovedBy || "Admin";
                              reason =
                                request.withdrawalReason ||
                                "Withdrawal approved by admin";
                              break;
                          }

                          // Calculate balance impact
                          // For rejected: no balance change (was never deducted)
                          // For withdrawn from pending: no balance change
                          // For withdrawn from approved: balance restored
                          let balanceBeforeAction = "N/A";
                          let balanceAfterAction = "N/A";

                          if (request.status === "rejected") {
                            balanceBeforeAction = "No impact";
                            balanceAfterAction = "No impact";
                          } else if (
                            request.status === "withdrawn" &&
                            statusBeforeAction === "pending"
                          ) {
                            balanceBeforeAction = "No impact";
                            balanceAfterAction = "No impact";
                          } else if (
                            request.status === "withdrawn" ||
                            request.status === "withdrawal_approved"
                          ) {
                            balanceBeforeAction = `Reduced by ${workingDays} days`;
                            balanceAfterAction = `Restored ${workingDays} days`;
                          } else if (request.status === "withdrawal_pending") {
                            balanceBeforeAction = `Reduced by ${workingDays} days`;
                            balanceAfterAction = "Pending restoration";
                          }

                          // Status badge color
                          const getStatusBadgeVariant = (status: string) => {
                            switch (status) {
                              case "rejected":
                                return "destructive";
                              case "withdrawn":
                                return "secondary";
                              case "withdrawal_pending":
                                return "outline";
                              case "withdrawal_approved":
                                return "default";
                              default:
                                return "outline";
                            }
                          };

                          return (
                            <TableRow
                              key={`withdraw-reject-${request.id}-${index}`}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <TableCell className="font-medium">
                                {employeeNumber}
                              </TableCell>
                              <TableCell>{employeeName}</TableCell>
                              <TableCell>{department}</TableCell>
                              <TableCell>{designation}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {request.id}
                                </Badge>
                              </TableCell>
                              <TableCell>{applicationDate}</TableCell>
                              <TableCell>{leavePeriod}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className="font-semibold"
                                >
                                  {workingDays} days
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800"
                                >
                                  {request.leaveTypeName ||
                                    "Unknown Leave Type"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {statusBeforeAction}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {balanceBeforeAction}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(
                                    request.status,
                                  )}
                                  className="capitalize"
                                >
                                  {actionTaken}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {balanceAfterAction}
                              </TableCell>
                              <TableCell>{actionInitiatedBy}</TableCell>
                              <TableCell className="max-w-xs">
                                <div
                                  className="text-sm text-gray-600 truncate"
                                  title={reason}
                                >
                                  {reason}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        },
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">
                    Total Rejected
                  </div>
                  <div className="text-2xl font-bold text-red-900">
                    {
                      filteredRequests.filter(
                        (req: any) => req.status === "rejected",
                      ).length
                    }
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">
                    Total Withdrawn
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {
                      filteredRequests.filter(
                        (req: any) =>
                          req.status === "withdrawn" ||
                          req.status === "withdrawal_approved",
                      ).length
                    }
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">
                    Withdrawal Pending
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {
                      filteredRequests.filter(
                        (req: any) => req.status === "withdrawal_pending",
                      ).length
                    }
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">
                    Days Affected
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {filteredRequests
                      .filter(
                        (req: any) =>
                          req.status === "rejected" ||
                          req.status === "withdrawn" ||
                          req.status === "withdrawal_pending" ||
                          req.status === "withdrawal_approved",
                      )
                      .reduce(
                        (sum: number, req: any) =>
                          sum + (parseFloat(req.workingDays) || 0),
                        0,
                      )
                      .toFixed(1)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "collaborative-leave-report":
        // Filter collaborative tasks based on filters
        const getFilteredCollaborativeTasks = () => {
          let filtered = collaborativeTasks || [];

          // Filter by date range
          if (dateRange?.from && dateRange?.to) {
            filtered = filtered.filter((task: any) => {
              const taskDate = task.createdAt ? new Date(task.createdAt) : null;
              return (
                taskDate &&
                taskDate >= dateRange.from &&
                taskDate <= dateRange.to
              );
            });
          }

          // Filter by task status
          if (selectedTaskStatus !== "all") {
            filtered = filtered.filter(
              (task: any) => task.status === selectedTaskStatus,
            );
          }

          // Filter by assignee name
          if (taskAssigneeFilter.trim()) {
            filtered = filtered.filter(
              (task: any) =>
                task.assigneeName
                  ?.toLowerCase()
                  .includes(taskAssigneeFilter.toLowerCase()) ||
                task.assigneeEmail
                  ?.toLowerCase()
                  .includes(taskAssigneeFilter.toLowerCase()),
            );
          }

          return filtered;
        };

        const filteredTasks = getFilteredCollaborativeTasks();

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaborative Leave Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track all collaborative leave task assignments across the
                organization with current statuses and performance metrics
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Summary Statistics */}
              <div className="p-6 border-b bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">
                        Total Tasks
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredTasks.length}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">
                        Completed
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {
                        filteredTasks.filter(
                          (task: any) => task.status === "done",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-600">
                        Pending
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-700">
                      {
                        filteredTasks.filter((task: any) =>
                          ["pending", "accepted"].includes(task.status),
                        ).length
                      }
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-600">
                        Rejected
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">
                      {
                        filteredTasks.filter((task: any) =>
                          ["rejected", "not_done"].includes(task.status),
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Task ID</TableHead>
                      <TableHead className="font-semibold">
                        Leave Request ID
                      </TableHead>
                      <TableHead className="font-semibold">
                        Leave Requester
                      </TableHead>
                      <TableHead className="font-semibold">
                        Assignee Name
                      </TableHead>
                      <TableHead className="font-semibold">
                        Assignee Email
                      </TableHead>
                      <TableHead className="font-semibold">
                        Task Description
                      </TableHead>
                      <TableHead className="font-semibold">
                        Support Date
                      </TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">
                        Accepted At
                      </TableHead>
                      <TableHead className="font-semibold">
                        Last Updated
                      </TableHead>
                      <TableHead className="font-semibold">
                        Status Comments
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="text-center py-8 text-gray-500"
                        >
                          No collaborative leave tasks found for the selected
                          criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task: any, index: number) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case "done":
                              return (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Completed
                                </Badge>
                              );
                            case "accepted":
                              return (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  In Progress
                                </Badge>
                              );
                            case "pending":
                              return (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Pending
                                </Badge>
                              );
                            case "rejected":
                              return (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  Rejected
                                </Badge>
                              );
                            case "not_done":
                              return (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                  Not Done
                                </Badge>
                              );
                            default:
                              return <Badge variant="outline">{status}</Badge>;
                          }
                        };

                        const supportDateRange =
                          task.expectedSupportDateFrom &&
                          task.expectedSupportDateTo
                            ? `${format(new Date(task.expectedSupportDateFrom), "dd-MMM-yyyy")} to ${format(new Date(task.expectedSupportDateTo), "dd-MMM-yyyy")}`
                            : task.expectedSupportDate
                              ? format(
                                  new Date(task.expectedSupportDate),
                                  "dd-MMM-yyyy",
                                )
                              : "Not specified";

                        return (
                          <TableRow
                            key={`task-${task.id}-${index}`}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <TableCell className="font-medium">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {task.id}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {task.leaveRequestId}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {task.leaveRequesterName ||
                                `User ${task.leaveRequesterId}` ||
                                "Unknown"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {task.assigneeName}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {task.assigneeEmail}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div
                                className="truncate"
                                title={task.taskDescription}
                              >
                                {task.taskDescription}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {supportDateRange}
                            </TableCell>
                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                            <TableCell className="text-sm">
                              {task.acceptedAt
                                ? format(
                                    new Date(task.acceptedAt),
                                    "dd-MMM-yyyy HH:mm",
                                  )
                                : "Not accepted"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {task.lastStatusUpdate
                                ? format(
                                    new Date(task.lastStatusUpdate),
                                    "dd-MMM-yyyy HH:mm",
                                  )
                                : "No updates"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div
                                className="truncate"
                                title={task.statusComments || "No comments"}
                              >
                                {task.statusComments || "No comments"}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case "bto-report":
        let btoData = btoRequests as any[];

        // Apply filters to BTO data
        if (btoEmployeeFilter) {
          btoData = btoData.filter((req: any) =>
            getEmployeeName(req.userId)
              .toLowerCase()
              .includes(btoEmployeeFilter.toLowerCase()),
          );
        }
        if (btoStatusFilter !== "all") {
          btoData = btoData.filter(
            (req: any) => req.status === btoStatusFilter,
          );
        }
        if (btoDateFilter !== "all") {
          const now = new Date();
          const filterDate = new Date();

          switch (btoDateFilter) {
            case "last-30":
              filterDate.setDate(now.getDate() - 30);
              break;
            case "last-90":
              filterDate.setDate(now.getDate() - 90);
              break;
            case "this-year":
              filterDate.setMonth(0, 1);
              break;
            default:
              filterDate.setFullYear(1900);
          }

          btoData = btoData.filter(
            (req: any) =>
              req.createdAt && new Date(req.createdAt) >= filterDate,
          );
        }
        if (btoTypeFilter !== "all") {
          btoData = btoData.filter(
            (req: any) =>
              req.ptoVariantName?.toLowerCase() === btoTypeFilter.toLowerCase(),
          );
        }

        return (
          <div className="space-y-6">
            {/* BTO Report Filters */}
            <Card>
              <CardHeader>
                <CardTitle>BTO Report Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Name</label>
                    <input
                      type="text"
                      placeholder="Search by employee name..."
                      value={btoEmployeeFilter}
                      onChange={(e) => setBtoEmployeeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={btoStatusFilter}
                      onValueChange={setBtoStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select
                      value={btoDateFilter}
                      onValueChange={setBtoDateFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-30">Last 30 days</SelectItem>
                        <SelectItem value="last-90">Last 90 days</SelectItem>
                        <SelectItem value="this-year">This year</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">BTO Type</label>
                    <Select
                      value={btoTypeFilter}
                      onValueChange={setBtoTypeFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {btoVariants?.map((variant: any) => (
                          <SelectItem
                            key={variant.id}
                            value={variant.name.toLowerCase()}
                          >
                            {variant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {btoData.length} of {(btoRequests as any[]).length}{" "}
                    BTO requests
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBtoEmployeeFilter("");
                      setBtoStatusFilter("all");
                      setBtoDateFilter("all");
                      setBtoTypeFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">
                          Employee Name
                        </TableHead>
                        <TableHead className="font-semibold">
                          Application ID
                        </TableHead>
                        <TableHead className="font-semibold">
                          BTO Type
                        </TableHead>
                        <TableHead className="font-semibold">
                          From Date
                        </TableHead>
                        <TableHead className="font-semibold">To Date</TableHead>
                        <TableHead className="font-semibold">
                          Total Hours
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">
                          Applied Date
                        </TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        if (btoData.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={9}
                                className="py-8 px-4 text-center text-muted-foreground"
                              >
                                No BTO requests found for this organization
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return btoData.map((request: any, index: number) => (
                          <TableRow
                            key={request.id || index}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="font-medium">
                              {getEmployeeName(request.userId)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-800"
                              >
                                BTO-{request.id}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {request.ptoVariantName || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.fromDate
                                ? new Date(request.fromDate).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {request.toDate
                                ? new Date(request.toDate).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {request.totalHours || request.hours || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  request.status === "approved"
                                    ? "default"
                                    : request.status === "pending"
                                      ? "secondary"
                                      : request.status === "rejected"
                                        ? "destructive"
                                        : "outline"
                                }
                                className={
                                  request.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : request.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : request.status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : ""
                                }
                              >
                                {request.status?.charAt(0).toUpperCase() +
                                  request.status?.slice(1) || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {request.createdAt
                                ? new Date(
                                    request.createdAt,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div
                                className="text-sm text-muted-foreground truncate"
                                title={request.reason}
                              >
                                {request.reason || "No reason provided"}
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
                    <div className="text-sm text-blue-600 font-medium">
                      Total BTO Requests
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {btoData.length}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">
                      Approved
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {
                        btoData.filter((req: any) => req.status === "approved")
                          .length
                      }
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-yellow-600 font-medium">
                      Pending
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {
                        btoData.filter((req: any) => req.status === "pending")
                          .length
                      }
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-red-600 font-medium">
                      Rejected
                    </div>
                    <div className="text-2xl font-bold text-red-900">
                      {
                        btoData.filter((req: any) => req.status === "rejected")
                          .length
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "comp-off-report":
        let compOffData = compOffRequests as any[];

        // Apply filters to Comp-off data
        if (compOffEmployeeFilter) {
          compOffData = compOffData.filter((req: any) =>
            getEmployeeName(req.userId)
              .toLowerCase()
              .includes(compOffEmployeeFilter.toLowerCase()),
          );
        }
        if (compOffStatusFilter !== "all") {
          compOffData = compOffData.filter(
            (req: any) => req.status === compOffStatusFilter,
          );
        }
        if (compOffDateFilter !== "all") {
          const now = new Date();
          const filterDate = new Date();

          switch (compOffDateFilter) {
            case "last-30":
              filterDate.setDate(now.getDate() - 30);
              break;
            case "last-90":
              filterDate.setDate(now.getDate() - 90);
              break;
            case "this-year":
              filterDate.setMonth(0, 1);
              break;
            default:
              filterDate.setFullYear(1900);
          }

          compOffData = compOffData.filter(
            (req: any) =>
              req.createdAt && new Date(req.createdAt) >= filterDate,
          );
        }
        if (compOffTypeFilter !== "all") {
          compOffData = compOffData.filter((req: any) =>
            req.type?.toLowerCase().includes(compOffTypeFilter.toLowerCase()),
          );
        }

        return (
          <div className="space-y-6">
            {/* Comp-off Report Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Comp-off Report Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee Name</label>
                    <input
                      type="text"
                      placeholder="Search by employee name..."
                      value={compOffEmployeeFilter}
                      onChange={(e) => setCompOffEmployeeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={compOffStatusFilter}
                      onValueChange={setCompOffStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select
                      value={compOffDateFilter}
                      onValueChange={setCompOffDateFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-30">Last 30 days</SelectItem>
                        <SelectItem value="last-90">Last 90 days</SelectItem>
                        <SelectItem value="this-year">This year</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comp-off Type</label>
                    <Select
                      value={compOffTypeFilter}
                      onValueChange={setCompOffTypeFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="weekend">Weekend Work</SelectItem>
                        <SelectItem value="holiday">Holiday Work</SelectItem>
                        <SelectItem value="overtime">Overtime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {compOffData.length} of{" "}
                    {(compOffRequests as any[]).length} comp-off requests
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCompOffEmployeeFilter("");
                      setCompOffStatusFilter("all");
                      setCompOffDateFilter("all");
                      setCompOffTypeFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">
                          Employee Name
                        </TableHead>
                        <TableHead className="font-semibold">
                          Application ID
                        </TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">
                          Work Date
                        </TableHead>
                        <TableHead className="font-semibold">
                          Comp-off Date
                        </TableHead>
                        <TableHead className="font-semibold">
                          Total Days
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">
                          Applied Date
                        </TableHead>
                        <TableHead className="font-semibold">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        if (compOffData.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={9}
                                className="py-8 px-4 text-center text-muted-foreground"
                              >
                                No comp-off requests found for this organization
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return compOffData.map(
                          (request: any, index: number) => (
                            <TableRow
                              key={request.id || index}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="font-medium">
                                {getEmployeeName(request.userId)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-800"
                                >
                                  CO-{request.id}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-100 text-orange-800"
                                >
                                  {request.type?.charAt(0).toUpperCase() +
                                    request.type?.slice(1) || "Standard"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {request.workDate
                                  ? new Date(
                                      request.workDate,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {request.compOffDate
                                  ? new Date(
                                      request.compOffDate,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">
                                  {request.days || "1"} day
                                  {request.days && request.days > 1 ? "s" : ""}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    request.status === "approved"
                                      ? "default"
                                      : request.status === "pending"
                                        ? "secondary"
                                        : request.status === "rejected"
                                          ? "destructive"
                                          : "outline"
                                  }
                                  className={
                                    request.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : request.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : request.status === "rejected"
                                          ? "bg-red-100 text-red-800"
                                          : ""
                                  }
                                >
                                  {request.status?.charAt(0).toUpperCase() +
                                    request.status?.slice(1) || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {request.createdAt
                                  ? new Date(
                                      request.createdAt,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div
                                  className="text-sm text-muted-foreground truncate"
                                  title={request.reason}
                                >
                                  {request.reason || "No reason provided"}
                                </div>
                              </TableCell>
                            </TableRow>
                          ),
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Comp-off Summary Statistics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium">
                      Total Comp-off Requests
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {compOffData.length}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">
                      Approved
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {
                        compOffData.filter(
                          (req: any) => req.status === "approved",
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-yellow-600 font-medium">
                      Pending
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {
                        compOffData.filter(
                          (req: any) => req.status === "pending",
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-red-600 font-medium">
                      Rejected
                    </div>
                    <div className="text-2xl font-bold text-red-900">
                      {
                        compOffData.filter(
                          (req: any) => req.status === "rejected",
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Select a report type to view data.</div>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {/* Only show header for other reports, not BTO or Comp-off */}
          {selectedReport !== "bto-report" &&
            selectedReport !== "comp-off-report" && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl">Admin Reports</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Comprehensive leave management analytics and insights
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedReport === "collaborative-leave-report" ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Task Status
                        </label>
                        <Select
                          value={selectedTaskStatus}
                          onValueChange={setSelectedTaskStatus}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="done">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="not_done">Not Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Assignee Name
                        </label>
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={taskAssigneeFilter}
                          onChange={(e) =>
                            setTaskAssigneeFilter(e.target.value)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Date Range
                        </label>
                        <div className="text-sm text-muted-foreground">
                          {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                          {format(dateRange.to, "MMM dd, yyyy")}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Actions</label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTaskStatus("all");
                              setTaskAssigneeFilter("");
                            }}
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Department
                        </label>
                        <Select
                          value={selectedDepartment}
                          onValueChange={setSelectedDepartment}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="engineering">
                              Engineering
                            </SelectItem>
                            <SelectItem value="hr">Human Resources</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Leave Type
                        </label>
                        <Select
                          value={selectedLeaveType}
                          onValueChange={setSelectedLeaveType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Leave Types</SelectItem>
                            {(leaveTypes as any[]).map((type: any) => (
                              <SelectItem
                                key={type.id}
                                value={type.id.toString()}
                              >
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Date Range
                        </label>
                        <div className="text-sm text-muted-foreground">
                          {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                          {format(dateRange.to, "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Report Content */}
          <div className="space-y-6">{renderReportContent()}</div>
        </div>
      </div>
    </Layout>
  );
}

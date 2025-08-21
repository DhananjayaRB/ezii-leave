import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ExternalLink, Check, X, FileText, Download, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { fetchEmployeeData } from "@/lib/externalApi";
import { useReportingManagerData } from "@/hooks/useReportingManagerData";

export default function Approvals() {
  const [activeRequestTab, setActiveRequestTab] = useState("Leaves");
  const [selectedApprovalTab, setSelectedApprovalTab] = useState("All");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  // Get reporting manager data for filtering
  const reportingManagerData = useReportingManagerData();

  // Check current view mode to prevent data fetching in employee view
  const currentView = localStorage.getItem('currentView') || 'admin';

  // Fetch ALL leave requests for 3-tab interface (Pending, Approved, Rejected) - when in admin view OR when user is a reporting manager
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: currentView === 'admin' || reportingManagerData.isReportingManager, // Fetch for admin or reporting managers
  });

  const { data: ptoRequests = [] } = useQuery({
    queryKey: ["/api/pto-requests"],
    enabled: currentView === 'admin' || reportingManagerData.isReportingManager, // Fetch for admin or reporting managers
  });

  const { data: compOffRequests = [] } = useQuery({
    queryKey: ["/api/comp-off-requests"],
    enabled: currentView === 'admin' || reportingManagerData.isReportingManager, // Fetch for admin or reporting managers
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch external employee data
  const { data: externalEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["external-employees"],
    queryFn: fetchEmployeeData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch blackout periods for checking leave conflicts
  const { data: blackoutPeriods = [] } = useQuery({
    queryKey: ["/api/blackout-periods"],
    enabled: currentView === 'admin' || reportingManagerData.isReportingManager, // Fetch for admin or reporting managers
  });

  // Helper function to get employee name
  const getEmployeeName = (userId: string) => {
    if (!userId) return 'Unknown Employee';

    // First try external API data - check both string and number matching
    const externalEmployee = (externalEmployees as any[]).find(emp => 
      emp.user_id === userId || emp.user_id === parseInt(userId) || emp.user_id?.toString() === userId
    );

    if (externalEmployee && externalEmployee.user_name) {
      return externalEmployee.user_name;
    }

    if (externalEmployee && (externalEmployee.first_name || externalEmployee.last_name)) {
      const name = `${externalEmployee.first_name || ''} ${externalEmployee.last_name || ''}`.trim();
      if (name) return name;
    }

    // Fallback to database users
    const dbEmployee = (users as any[]).find(user => user.id === userId);
    if (dbEmployee && dbEmployee.firstName) {
      return `${dbEmployee.firstName} ${dbEmployee.lastName || ''}`.trim();
    }

    // Only use authentic database users - no hardcoded mappings

    // If external API and database lookup both fail, show employee ID only
    // This ensures we never display fake employee names
    return `Employee ID: ${userId}`;
  };

  // Function to check if a leave request overlaps with any blackout period
  const checkBlackoutPeriodConflict = (userId: string, startDate: string, endDate: string): { hasConflict: boolean, periodName?: string } => {
    if (!blackoutPeriods || blackoutPeriods.length === 0) {
      return { hasConflict: false };
    }

    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);

    for (const period of blackoutPeriods as any[]) {
      // Check if user is assigned to this blackout period (check both string and number formats)
      const isUserAssigned = period.assignedEmployees && (
        period.assignedEmployees.includes(userId.toString()) || 
        period.assignedEmployees.includes(parseInt(userId))
      );

      if (!isUserAssigned) {
        continue; // User not assigned to this blackout period
      }

      // Check if leave dates overlap with blackout period
      const blackoutStart = new Date(period.startDate);
      const blackoutEnd = new Date(period.endDate);

      // Check for date overlap: (startA <= endB) && (startB <= endA)
      const hasOverlap = (requestStart <= blackoutEnd) && (blackoutStart <= requestEnd);

      if (hasOverlap) {
        return { hasConflict: true, periodName: period.title };
      }
    }

    return { hasConflict: false };
  };

  // Apply reporting manager filtering to all request types
  let filteredLeaveRequests = leaveRequests as any[];
  let filteredPtoRequests = ptoRequests as any[];
  let filteredCompOffRequests = compOffRequests as any[];

  console.log('🔍 [Approvals] Pre-filter comp-off requests:', filteredCompOffRequests.length);
  console.log('🔍 [Approvals] Reporting manager data:', {
    isReportingManager: reportingManagerData.isReportingManager,
    reporteesCount: reportingManagerData.reportees.length,
    currentView: currentView
  });

  if (reportingManagerData.isReportingManager && reportingManagerData.reportees.length > 0) {
    const reporteeIds = reportingManagerData.reportees.map(r => r.user_id.toString());
    console.log('🔍 [Approvals] Filtering for reportees:', reporteeIds);

    filteredLeaveRequests = filteredLeaveRequests.filter(req => 
      reporteeIds.includes(req.userId?.toString())
    );
    filteredPtoRequests = filteredPtoRequests.filter(req => 
      reporteeIds.includes(req.userId?.toString())
    );
    filteredCompOffRequests = filteredCompOffRequests.filter(req => 
      reporteeIds.includes(req.userId?.toString())
    );

    console.log('🔍 [Approvals] Post-filter comp-off requests:', filteredCompOffRequests.length);
  } else {
    console.log('🔍 [Approvals] No filtering applied - showing all requests');
  }

  // Get current tab data based on selected request type
  const getCurrentTabData = () => {
    switch (activeRequestTab) {
      case "BTO": return filteredPtoRequests;
      case "CompOff": return filteredCompOffRequests;
      default: return filteredLeaveRequests;
    }
  };

  const currentTabData = getCurrentTabData();
  const pendingRequests = currentTabData.filter(req => req.status === 'pending' || req.status === 'withdrawal_pending');
  const approvedRequests = currentTabData.filter(req => req.status === 'approved');
  const rejectedRequests = currentTabData.filter(req => req.status === 'rejected');

  const requestTabs = [
    { id: "Leaves", label: "Leaves", count: filteredLeaveRequests.length, active: activeRequestTab === "Leaves" },
    { id: "BTO", label: "BTO", count: filteredPtoRequests.length, active: activeRequestTab === "BTO" },
    { id: "CompOff", label: "CompOff", count: filteredCompOffRequests.length, active: activeRequestTab === "CompOff" }
  ];

  const approvalTabs = [
    { id: "All", label: "All", count: currentTabData.length },
    { id: "Pending", label: "Pending", count: pendingRequests.length },
    { id: "Approved", label: "Approved", count: approvedRequests.length },
    { id: "Rejected", label: "Rejected", count: rejectedRequests.length }
  ];

  // Filter requests based on selected tab and search query
  const getFilteredRequests = () => {
    let requests;
    switch (selectedApprovalTab) {
      case "Pending": requests = pendingRequests; break;
      case "Approved": requests = approvedRequests; break;
      case "Rejected": requests = rejectedRequests; break;
      default: requests = currentTabData;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      requests = requests.filter((request: any) => {
        const employeeName = getEmployeeName(request.userId).toLowerCase();
        const query = searchQuery.toLowerCase();

        // Search by employee name
        if (employeeName.includes(query)) return true;

        // Search by leave type
        let leaveType = '';
        if (activeRequestTab === "BTO") {
          leaveType = "BTO";
        } else if (activeRequestTab === "CompOff") {
          leaveType = `Comp-off (${request.type})`;
        } else {
          const leaveTypeObj = (leaveTypes as any[]).find(type => type.id === request.leaveTypeId);
          leaveType = leaveTypeObj?.name || 'Unknown Leave Type';
        }

        if (leaveType.toLowerCase().includes(query)) return true;

        // Search by status
        const status = request.status === 'withdrawal_pending' ? 'withdrawal pending' : request.status;
        if (status.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    // Sort requests to prioritize withdrawal_pending (most recent actions) at the top
    const sorted = requests.sort((a: any, b: any) => {
      // Prioritize withdrawal_pending requests first
      if (a.status === 'withdrawal_pending' && b.status !== 'withdrawal_pending') return -1;
      if (b.status === 'withdrawal_pending' && a.status !== 'withdrawal_pending') return 1;

      // Then sort by creation date (most recent first)
      const dateA = new Date(a.createdAt || a.startDate || a.requestDate).getTime();
      const dateB = new Date(b.createdAt || b.startDate || b.requestDate).getTime();
      return dateB - dateA;
    });

    return sorted;
  };

  // Get paginated data
  const getAllFilteredRequests = () => getFilteredRequests();
  const paginatedRequests = () => {
    const filtered = getAllFilteredRequests();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Pagination calculations
  const totalItems = getAllFilteredRequests().length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Reset pagination when filters change
  const handleTabChange = (tab: string) => {
    setSelectedApprovalTab(tab);
    setCurrentPage(1);
  };

  const handleRequestTabChange = (tab: string) => {
    setActiveRequestTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const endpoint = getApprovalEndpoint();
      return apiRequest("POST", `${endpoint}/${requestId}/approve`);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pto-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-leave-balances"] });
      toast({
        title: "Success",
        description: `${activeRequestTab.slice(0, -1)} request approved successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to approve ${activeRequestTab.toLowerCase()} request`,
        variant: "destructive",
      });
    },
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      const endpoint = getApprovalEndpoint();
      return apiRequest("POST", `${endpoint}/${requestId}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pto-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-requests"] });
      toast({
        title: "Success",
        description: `${activeRequestTab.slice(0, -1)} request rejected successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to reject ${activeRequestTab.toLowerCase()} request`,
        variant: "destructive",
      });
    },
  });

  // Helper function to get the correct API endpoint
  const getApprovalEndpoint = () => {
    switch (activeRequestTab) {
      case "BTO": return "/api/pto-requests";
      case "CompOff": return "/api/comp-off-requests";
      default: return "/api/leave-requests";
    }
  };

  const handleApprove = (requestId: number) => {
    approveRequestMutation.mutate(requestId);
  };

  const handleReject = (requestId: number) => {
    setSelectedRequestId(requestId);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (selectedRequestId && rejectionReason.trim()) {
      rejectRequestMutation.mutate({ 
        requestId: selectedRequestId, 
        reason: rejectionReason.trim() 
      });
      setShowRejectModal(false);
      setSelectedRequestId(null);
      setRejectionReason("");
    }
  };

  const handleViewDocuments = (documents: string[]) => {
    setSelectedDocuments(documents);
    setShowDocumentModal(true);
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Approval Requests Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Approval Requests</CardTitle>
              <div className="flex items-center space-x-1">
                {requestTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={tab.active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRequestTabChange(tab.id)}
                    className={`${
                      tab.active 
                        ? "bg-black text-white hover:bg-gray-800" 
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Sub-tabs for approval status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6 border-b border-gray-200">
                {approvalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedApprovalTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>{tab.label} ({tab.count})</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <ExternalLink className="w-4 h-4 mr-1" />
                View All
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by employee name, leave type, or status..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Leave Requests List */}
            {isLoadingEmployees ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Loading employee data...</p>
              </div>
            ) : getAllFilteredRequests().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  {searchQuery ? `No results found for "${searchQuery}"` : "No leave requests found"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Date Applied</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Leave Period</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Days</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Blackout Period</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests().map((request: any) => {
                      // Handle different request types
                      let displayInfo;
                      if (activeRequestTab === "BTO") {
                        displayInfo = {
                          type: "BTO",
                          startDate: new Date(request.requestDate).toLocaleDateString(),
                          endDate: new Date(request.requestDate).toLocaleDateString(),
                          days: request.timeType === 'half_day' ? '0.5' : request.timeType === 'quarter_day' ? '0.25' : request.totalHours ? `${request.totalHours}h` : '1',
                          hasDocuments: request.documentUrl
                        };
                      } else if (activeRequestTab === "CompOff") {
                        displayInfo = {
                          type: `Comp-off (${request.type})`,
                          startDate: new Date(request.date || request.createdAt).toLocaleDateString(),
                          endDate: new Date(request.date || request.createdAt).toLocaleDateString(),
                          days: request.amount || request.transferAmount || '1',
                          hasDocuments: request.documentUrl
                        };
                      } else {
                        const leaveType = (leaveTypes as any[]).find(type => type.id === request.leaveTypeId);
                        displayInfo = {
                          type: leaveType?.name || 'Unknown Leave Type',
                          startDate: new Date(request.startDate).toLocaleDateString(),
                          endDate: new Date(request.endDate).toLocaleDateString(),
                          days: request.workingDays || request.totalDays || '1',
                          hasDocuments: request.documents && request.documents.length > 0
                        };
                      }

                      return (
                        <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {getEmployeeName(request.userId)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {displayInfo.type}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {new Date(request.createdAt || request.startDate || request.requestDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {displayInfo.startDate === displayInfo.endDate ? displayInfo.startDate : `${displayInfo.startDate} - ${displayInfo.endDate}`}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {displayInfo.days} {activeRequestTab === "BTO" && request.timeType === 'hours' ? '' : 'days'}
                          </td>
                          <td className="py-3 px-4">
                            {displayInfo.hasDocuments ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDocuments(activeRequestTab === "Leaves" ? request.documents : [request.documentUrl])}
                                className="text-blue-600 hover:text-blue-700 p-1"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">No documents</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              // Only check blackout conflicts for leave requests, not BTO or CompOff
                              if (activeRequestTab === "Leaves") {
                                const blackoutCheck = checkBlackoutPeriodConflict(
                                  request.userId,
                                  request.startDate,
                                  request.endDate
                                );

                                if (blackoutCheck.hasConflict) {
                                  return (
                                    <div className="text-sm">
                                      <span className="text-red-600 font-medium">Yes</span>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {blackoutCheck.periodName}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return <span className="text-gray-500 text-sm">No</span>;
                                }
                              } else {
                                return <span className="text-gray-400 text-sm">N/A</span>;
                              }
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'withdrawal_pending' ? 'secondary' :
                                request.status === 'approved' ? 'default' : 'destructive'
                              }
                              className={
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'withdrawal_pending' ? 'bg-purple-100 text-purple-800' :
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {request.status === 'withdrawal_pending' ? 'Withdrawal Pending' : 
                               request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              {(request.status === 'pending' || request.status === 'withdrawal_pending') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApprove(request.id)}
                                    disabled={approveRequestMutation.isPending}
                                    className="text-green-600 border-green-200 hover:bg-green-50 px-2 py-1 h-7 text-xs whitespace-nowrap"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReject(request.id)}
                                    disabled={rejectRequestMutation.isPending}
                                    className="text-red-600 border-red-200 hover:bg-red-50 px-2 py-1 h-7 text-xs whitespace-nowrap"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {request.status !== 'pending' && (
                                <span className="text-gray-400 text-sm">
                                  {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    <span>
                      Showing {startItem} to {endItem} of {totalItems} results
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Reason for rejection *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejecting this leave request..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim() || rejectRequestMutation.isPending}
            >
              {rejectRequestMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewing Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Supporting Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDocuments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents attached</p>
            ) : (
              <div className="space-y-3">
                {selectedDocuments.map((document, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {document.split('/').pop() || `Document ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-500">Supporting document</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(document, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = window.document.createElement('a');
                          link.href = document;
                          link.download = document.split('/').pop() || 'document';
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDocumentModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
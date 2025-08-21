import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import BTOApplicationForm from "@/components/PTO/PTOApplicationForm";
import { usePermissions } from "@/hooks/usePermissions";
import { useExternalEmployeeData } from "@/hooks/useExternalEmployeeData";

export default function PTO() {
  const [activeTab, setActiveTab] = useState("All");
  const [dateRange, setDateRange] = useState("01 Jun 2024 - 31st Dec 2024");
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  // Apply on behalf functionality moved to inside the dialog

  const permissions = usePermissions();
  const { employees: externalEmployees } = useExternalEmployeeData();

  // Apply on behalf functionality moved to inside the dialog

  // Apply on behalf functionality moved to inside the dialog

  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem('user_id') || '225';

  // Fetch BTO requests
  const { data: btoRequests = [], isLoading: requestsLoading, refetch } = useQuery({
    queryKey: ['/api/pto-requests', currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/pto-requests?userId=${currentUserId}`, {
        credentials: 'include',
        headers: {
          'X-Org-Id': localStorage.getItem('org_id') || '60'
        }
      });
      return response.ok ? response.json() : [];
    },
  });

  // Filter requests by active tab
  const filteredRequests = btoRequests.filter((request: any) => {
    if (activeTab === "All") return true;
    return request.status.toLowerCase() === activeTab.toLowerCase();
  });

  // Calculate statistics from real data
  const stats = {
    totalGranted: btoRequests.filter((r: any) => r.status === "approved").length,
    pendingApprovals: btoRequests.filter((r: any) => r.status === "pending").length,
    totalAvailed: btoRequests.filter((r: any) => r.status === "approved").reduce((sum: number, r: any) => {
      if (r.timeType === "hours") {
        // Direct hours calculation
        return sum + (parseFloat(r.totalHours) || 0);
      } else if (r.timeType === "half_day") {
        return sum + 4; // Half day = 4 hours
      } else if (r.timeType === "quarter_day") {
        return sum + 2; // Quarter day = 2 hours
      } else {
        return sum + 8; // Full day = 8 hours
      }
    }, 0),
    rejected: btoRequests.filter((r: any) => r.status === "rejected").length,
    cancelled: btoRequests.filter((r: any) => r.status === "cancelled").length,
  };

  const tabs = [
    { id: "All", label: "All" },
    { id: "Pending", label: "Pending", count: stats.pendingApprovals },
    { id: "Approved", label: "Approved" },
    { id: "Rejected", label: "Rejected" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "approved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "cancelled":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatTimeDisplay = (request: any) => {
    if (request.timeType === "hours") {
      const startTime = new Date(`2000-01-01T${request.startTime}`).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const endTime = new Date(`2000-01-01T${request.endTime}`).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      return `${startTime} - ${endTime} (${request.totalHours}h)`;
    } else {
      const typeMap = {
        "full_day": "Full Day",
        "half_day": "Half Day", 
        "quarter_day": "Quarter Day"
      };
      return typeMap[request.timeType as keyof typeof typeMap] || request.timeType;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Break Time Off (BTO)</h1>
          <div className="flex items-center space-x-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01 Jun 2024 - 31st Dec 2024">01 Jun 2024 - 31st Dec 2024</SelectItem>
                <SelectItem value="01 Jan 2024 - 31st May 2024">01 Jan 2024 - 31st May 2024</SelectItem>
                <SelectItem value="01 Jan 2024 - 31st Dec 2024">01 Jan 2024 - 31st Dec 2024</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setShowApplicationForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Apply for BTO
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalGranted}</div>
              <div className="text-sm text-gray-600">Total Approved</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
              <div className="text-sm text-gray-600">Pending Approvals</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalAvailed.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-700">Rejected</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-700">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Loading BTO requests...</p>
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {activeTab === "All" ? "No BTO requests found" : `No ${activeTab.toLowerCase()} requests found`}
                  </p>
                  <Button 
                    className="mt-4 bg-teal-600 hover:bg-teal-700"
                    onClick={() => setShowApplicationForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Apply for BTO
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time / Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied On
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((request: any) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(request.requestDate), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimeDisplay(request)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(request.status)}>
                            {getStatusIcon(request.status)}
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(request.createdAt), "dd MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BTO Application Form */}
      <BTOApplicationForm 
        open={showApplicationForm}
        onOpenChange={setShowApplicationForm}
        onSuccess={() => {
          refetch(); // Refresh the BTO requests list
        }}
        employees={externalEmployees}
        permissions={permissions}
      />
    </Layout>
  );
}
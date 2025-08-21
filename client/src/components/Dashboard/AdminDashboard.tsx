import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Plane, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight 
} from "lucide-react";
import { fetchEmployeeData } from "@/lib/externalApi";
import { useReportingManagerData } from "@/hooks/useReportingManagerData";
import { useWorkPattern } from "@/hooks/useWorkPattern";

export default function AdminDashboard() {
  const [activeRequestTab, setActiveRequestTab] = useState("Leaves");
  const [selectedApprovalTab, setSelectedApprovalTab] = useState("All");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Check current view mode to prevent data fetching in employee view
  const currentView = localStorage.getItem('currentView') || 'admin';

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: currentView === 'admin', // Only fetch when in admin view
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

  // Reporting manager data
  const reportingManagerData = useReportingManagerData();

  // Get current user ID for work pattern
  const currentUserId = localStorage.getItem('user_id') || '1';
  
  // Fetch user's work pattern and filtered holidays
  const { workPattern, holidays: workPatternHolidays, isHoliday: workPatternIsHoliday, isWorkingDay } = useWorkPattern();

  const { data: compOffConfig } = useQuery({
    queryKey: ["/api/comp-off-config"],
  });

  // Helper function to get employee name from external API data
  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Use work pattern holiday and working day functions
  const isHoliday = workPatternIsHoliday;
  const isNonWorkingDay = (date: Date) => !isWorkingDay(date);

  const getEmployeeName = (userId: string) => {
    if (!userId) return 'Employee';
    
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
    
    // Known employee mappings based on system data
    const knownEmployees: Record<string, string> = {
      "225": "Ashwani Khanna",
      "231": "Sumalatha Thadimari", 
      "7243": "Sumalatha Thadimari",
      "7244": "Ashwani Khanna",
      "12080": "Rahul Sharma",
      "7246": "Anjali Kumari"
    };
    
    return knownEmployees[userId] || `Employee ${userId}`;
  };

  const { data: ptoConfig } = useQuery({
    queryKey: ["/api/pto-config"],
  });

  // Calculate real stats
  const allRequests = leaveRequests as any[];
  const pendingRequests = allRequests.filter((req: any) => req.status === "pending");
  const approvedRequests = allRequests.filter((req: any) => req.status === "approved");
  const rejectedRequests = allRequests.filter((req: any) => req.status === "rejected");

  // Filter requests based on selected tab
  const getFilteredRequests = () => {
    switch (selectedApprovalTab) {
      case "Pending":
        return pendingRequests;
      case "Approved":
        return approvedRequests;
      case "Rejected":
        return rejectedRequests;
      default:
        return allRequests;
    }
  };

  const filteredRequests = getFilteredRequests();

  const totalLeaves = (leaveTypes as any[]).length;
  const ptoEnabled = (ptoConfig as any)?.enabled ? 1 : 0;
  const compOffEnabled = (compOffConfig as any)?.enabled ? 1 : 0;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leaves</p>
                  <p className="text-2xl font-semibold text-gray-800">{totalLeaves}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">BTO</p>
                  <p className="text-2xl font-semibold text-gray-800">{ptoEnabled}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Plane className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">CompOff</p>
                  <p className="text-2xl font-semibold text-gray-800">{compOffEnabled}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Requests Section */}
        <Card className="mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Approval Requests</h2>
              <div className="flex space-x-2">
                <Button 
                  variant={activeRequestTab === "Leaves" ? "default" : "outline"}
                  size="sm"
                  className={activeRequestTab === "Leaves" ? "bg-gray-900 text-white" : ""}
                  onClick={() => setActiveRequestTab("Leaves")}
                >
                  Leaves ({allRequests.length})
                </Button>
                <Button 
                  variant={activeRequestTab === "BTO" ? "default" : "outline"} 
                  size="sm"
                  className={activeRequestTab === "BTO" ? "bg-gray-900 text-white" : ""}
                  onClick={() => setActiveRequestTab("BTO")}
                >
                  BTO (0)
                </Button>
                <Button 
                  variant={activeRequestTab === "CompOff" ? "default" : "outline"} 
                  size="sm"
                  className={activeRequestTab === "CompOff" ? "bg-gray-900 text-white" : ""}
                  onClick={() => setActiveRequestTab("CompOff")}
                >
                  CompOff (0)
                </Button>
              </div>
            </div>
            <div className="flex space-x-6 mt-4 text-sm">
              <button 
                className={`transition-colors flex items-center space-x-1 pb-1 ${
                  selectedApprovalTab === "All" 
                    ? "text-primary font-medium border-b-2 border-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSelectedApprovalTab("All")}
              >
                All ({allRequests.length})
              </button>
              <button 
                className={`transition-colors flex items-center space-x-1 pb-1 ${
                  selectedApprovalTab === "Pending" 
                    ? "text-primary font-medium border-b-2 border-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSelectedApprovalTab("Pending")}
              >
                <span>Pending ({pendingRequests.length})</span>
                <Clock className="w-3 h-3" />
              </button>
              <button 
                className={`transition-colors flex items-center space-x-1 pb-1 ${
                  selectedApprovalTab === "Approved" 
                    ? "text-primary font-medium border-b-2 border-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSelectedApprovalTab("Approved")}
              >
                <span>Approved ({approvedRequests.length})</span>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </button>
              <button 
                className={`transition-colors flex items-center space-x-1 pb-1 ${
                  selectedApprovalTab === "Rejected" 
                    ? "text-primary font-medium border-b-2 border-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setSelectedApprovalTab("Rejected")}
              >
                <span>Rejected ({rejectedRequests.length})</span>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {activeRequestTab === "BTO" ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No BTO requests</h3>
                <p className="text-gray-600">
                  BTO requests will appear here when submitted by employees.
                </p>
              </div>
            ) : activeRequestTab === "CompOff" ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No CompOff requests</h3>
                <p className="text-gray-600">
                  Compensatory off requests will appear here when submitted by employees.
                </p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
                <p className="text-gray-600">
                  Employee leave requests will appear here for approval.
                </p>
              </div>
            ) : (
              filteredRequests.slice(0, 3).map((request: any) => {
                const employee = (users as any[]).find(user => user.id === request.userId);
                const leaveType = (leaveTypes as any[]).find(type => type.id === request.leaveTypeId);
                return (
                  <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(() => {
                              const name = getEmployeeName(request.userId);
                              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                              return initials || 'UN';
                            })()}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {getEmployeeName(request.userId)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {leaveType?.name || 'Leave'} • {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          request.status === 'pending' ? 'default' :
                          request.status === 'approved' ? 'secondary' : 'destructive'
                        }>
                          {request.status}
                        </Badge>
                        <p className="text-sm text-gray-500">{request.workingDays} days</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {allRequests.length > 3 && (
            <div className="p-4 text-center border-t">
              <Link href="/approvals">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all {allRequests.length} requests
                </button>
              </Link>
            </div>
          )}
        </Card>

        {/* Calendar Section */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Calendar</h2>
              <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-white">
                Set Block-out Period +
              </Button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-lg font-medium text-gray-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" className="bg-gray-600 text-white border-gray-600" onClick={goToToday}>
                  today
                </Button>
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDay.getDay());
                
                const calendarDays = [];
                for (let i = 0; i < 42; i++) {
                  const day = new Date(startDate);
                  day.setDate(startDate.getDate() + i);
                  
                  const isCurrentMonth = day.getMonth() === month;
                  const dayNumber = day.getDate();
                  
                  // Check if this day is a holiday or non-working day
                  const isDayHoliday = isHoliday(day);
                  const isDayNonWorking = isNonWorkingDay(day);
                  
                  // Find approved leaves for this date
                  const leavesOnThisDay = isCurrentMonth ? approvedRequests.filter((request: any) => {
                    const requestStartDate = new Date(request.startDate);
                    const requestEndDate = new Date(request.endDate);
                    return day >= requestStartDate && day <= requestEndDate;
                  }) : [];
                  
                  const hasLeave = leavesOnThisDay.length > 0;
                  
                  // Get the holiday name if it's a holiday
                  const getHolidayName = () => {
                    if (!isDayHoliday) return null;
                    const dateString = day.toISOString().split('T')[0];
                    const holiday = workPatternHolidays.find((h: any) => {
                      const holidayDate = h.date || h.selectedDate;
                      return holidayDate === dateString;
                    });
                    return holiday?.name || 'Holiday';
                  };

                  calendarDays.push(
                    <div
                      key={i}
                      className={`p-3 h-16 border border-gray-200 text-sm ${
                        !isCurrentMonth 
                          ? 'bg-gray-50 text-gray-400' 
                          : isDayHoliday
                            ? 'bg-red-300 border-red-400 text-red-900'
                            : isDayNonWorking
                              ? 'bg-gray-400 text-white'
                              : hasLeave 
                                ? 'bg-green-100' 
                                : 'bg-white hover:bg-gray-50'
                      } cursor-pointer`}
                    >
                      <div className="font-medium">{dayNumber}</div>
                      
                      {/* Show holiday label */}
                      {isDayHoliday && isCurrentMonth && (
                        <div className="text-xs text-red-700 font-medium mt-1">
                          HOLIDAY
                        </div>
                      )}
                      
                      {/* Show non-working label */}
                      {isDayNonWorking && !isDayHoliday && isCurrentMonth && (
                        <div className="text-xs text-white font-medium mt-1">
                          NON-WORK
                        </div>
                      )}
                      
                      {/* Show leave requests */}
                      {hasLeave && isCurrentMonth && !isDayHoliday && !isDayNonWorking && 
                        leavesOnThisDay.slice(0, 2).map((request: any, index: number) => {
                          const employeeName = getEmployeeName(request.userId);
                          const leaveType = (leaveTypes as any[]).find(type => type.id === request.leaveTypeId);
                          return (
                            <div key={index} className="text-xs text-green-700 mt-1 truncate">
                              {employeeName} - {leaveType?.name || 'Leave'}
                            </div>
                          );
                        })
                      }
                    </div>
                  );
                }
                return calendarDays;
              })()}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

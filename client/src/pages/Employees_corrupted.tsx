import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ChevronRight, ChevronLeft, X, MapPin, User, Edit } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]); // Store all employees
  const [employees, setEmployees] = useState<any[]>([]); // Store filtered employees
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Use internal API endpoint instead of external API
  const { data: employeeData = [], isLoading: isLoadingEmployees, error: employeeError } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes cache (cacheTime is deprecated in v5)
  });

  // Process employee data when it loads
  useEffect(() => {
    if (employeeData.length > 0) {
      try {
        console.log('[Employees] Processing employee data...', employeeData.length);
        
        // Transform internal API data to match component structure
        const formattedEmployees = employeeData.map((emp: any) => {
          return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            designation: "Employee", // Default designation
            function: "General", // Default function
            division: "Employee", // Default division
            location: "Office", // Default location
            leaveTypesApplied: 0, // Will be calculated based on actual leave assignments
            avatar: null, // No avatar in basic API
            joinedDate: "N/A", // Not available in basic API
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            employeeNumber: emp.id,
            gender: "N/A", // Not available in basic API
            phoneNumber: "N/A", // Not available in basic API
            reportingManager: "N/A" // Not available in basic API
          };
        });

        console.log('[Employees] Successfully formatted employees:', formattedEmployees.length);
        setAllEmployees(formattedEmployees);
        setEmployees(formattedEmployees);
        setError(null);
      } catch (error) {
        console.error("[Employees] Error processing employees:", error);
        setError('Failed to process employee data. Please try again.');
      }
    } else if (employeeError) {
      console.error("[Employees] Error loading employees:", employeeError);
      setError('Failed to load employee data. Please try again.');
      setAllEmployees([]);
      setEmployees([]);
    }
  }, [employeeData, employeeError]);

  // Show loading skeleton
  if (isLoadingEmployees) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show main content
  return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          
          {/* Search bar skeleton */}
          <div className="mb-6">
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
          
          {/* Table skeleton */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="grid grid-cols-5 gap-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Apply reporting manager filtering when reportingManagerData changes
  useEffect(() => {
    if (allEmployees.length > 0) {
      let filteredEmployees = [...allEmployees];
      
      if (reportingManagerData.isReportingManager && reportingManagerData.reportees.length > 0) {
        // User is a reporting manager - filter to show only their reportees
        const reporteeIds = reportingManagerData.reportees.map(r => r.user_id.toString());
        filteredEmployees = allEmployees.filter(emp => 
          reporteeIds.includes(emp.id.toString())
        );
        console.log(`[Employees] Filtered to ${filteredEmployees.length} reportees for reporting manager`);
      } else {
        // User is not a reporting manager or API returned no data - show all employees
        console.log(`[Employees] Showing all ${allEmployees.length} employees`);
      }
      
      setEmployees(filteredEmployees);
    }
  }, [allEmployees, reportingManagerData.isReportingManager, reportingManagerData.reportees]);

  const stats = {
    total: employees.length,
    onLeave: 0, // Calculate from actual leave data
    onBTO: 0, // Calculate from actual BTO data
    onCompOff: 0, // Calculate from actual comp-off data
    absent: 0, // Calculate from actual absence data
    totalLossOfPay: 0 // Calculate from actual LOP data
  };

  const leaveTypes = [
    { name: "Casual Leave", balance: "12/20 d", color: "bg-gray-400" },
    { name: "Sick Leave", balance: "12/20 d", color: "bg-gray-400" },
    { name: "Earned Leave", balance: "12/20 d", color: "bg-gray-400" },
    { name: "Marriage Leave", balance: "12/20 d", color: "bg-gray-400" },
    { name: "Bereavement Leave", balance: "12/20 d", color: "bg-gray-400" }
  ];

  const leaveStatistics = [
    { label: "Total Granted", value: 6 },
    { label: "Pending approvals", value: 6 },
    { label: "Total availed", value: 4 },
    { label: "Total Encashed", value: 6 },
    { label: "Carry forwards", value: 6 },
    { label: "Total Rejected", value: 2 },
    { label: "Absent", value: 2 },
    { label: "Total Loss of Pay", value: 0 },
    { label: "Total lapsed", value: 0 }
  ];

  const handleEmployeeClick = (employee: any) => {
    setSelectedEmployee(employee);
    setShowLeaveDetails(true);
  };

  const handleBackToList = () => {
    setShowLeaveDetails(false);
    setSelectedEmployee(null);
  };

  const handleAssignLeaves = (employee: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click event
    
    // Store the selected employee for "Apply on Behalf" functionality
    localStorage.setItem('applyOnBehalfEmployee', JSON.stringify({
      id: employee.id,
      name: employee.name,
      designation: employee.designation
    }));
    
    // Navigate to leave applications page with apply on behalf enabled
    setLocation('/leave-applications?onBehalf=true');
  };

  if (showLeaveDetails && selectedEmployee) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          {/* Header with back button */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToList}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Employees Leave Details</h1>
          </div>

          {/* Employee Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {(selectedEmployee as any).name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {(selectedEmployee as any).name} ({(selectedEmployee as any).designation})
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>Function - {(selectedEmployee as any).function}</span>
                      <span>Division - {(selectedEmployee as any).division}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{(selectedEmployee as any).location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>Reporting to {(selectedEmployee as any).id === '7246' ? 'Rahul Sharma' : 'Admin User'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  Joined on {(selectedEmployee as any).joinedDate}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No leaves applied section */}
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No leaves applied currently</p>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                Setup Leaves
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Leave Types and Balances */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Leave Types and Balances</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                {leaveTypes.map((leaveType, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-12 h-12 ${leaveType.color} rounded-full mx-auto mb-2`}></div>
                    <div className="text-sm font-medium text-gray-900">{leaveType.name}</div>
                    <div className="text-sm text-gray-600">{leaveType.balance}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leave Statistics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Leave Statistics</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                {leaveStatistics.slice(0, 8).map((stat, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {leaveStatistics.slice(8).map((stat, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500">Loading employee data...</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          </div>
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <X className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Unable to Load Employee Data</h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Employees ({stats.total})</h1>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search for employees"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm" className="text-gray-600">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-700">{stats.onLeave}</div>
              <div className="text-sm text-teal-600">On leave</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.onBTO}</div>
              <div className="text-sm text-blue-600">On BTO</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.onCompOff}</div>
              <div className="text-sm text-green-600">On Comp-off</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-700">{stats.absent}</div>
              <div className="text-sm text-orange-600">Absent</div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.totalLossOfPay}</div>
              <div className="text-sm text-red-600">Total Loss of Pay</div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Banner */}
        <div className="bg-black text-white p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">Leaves have not been set up for (0) Employees Apply Filter</span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Employee Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Function
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Division
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Types Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees
                    .filter(employee => 
                      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      employee.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      employee.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEmployeeClick(employee)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {employee.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.designation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.function}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.division}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.leaveTypesApplied > 0 ? (
                          <span>{employee.leaveTypesApplied}</span>
                        ) : (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-blue-600 p-0 h-auto"
                            onClick={(e) => handleAssignLeaves(employee, e)}
                          >
                            Assign Leaves
                          </Button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>


      </div>
    </Layout>
  );
}
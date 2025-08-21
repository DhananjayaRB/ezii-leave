import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter, ChevronRight, ChevronLeft, X, MapPin, User, Edit, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [, setLocation] = useLocation();

  // Use internal API endpoint that calls external worker-master-leave API
  const { data: employeeData = [], isLoading: isLoadingEmployees, error: employeeError } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Process employee data when it loads
  useEffect(() => {
    if (employeeData.length > 0) {
      try {
        console.log('[Employees] Processing employee data...', employeeData.length);
        
        // Transform external API data to match component structure
        const formattedEmployees = employeeData.map((emp: any) => {
          return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            designation: emp.designation || "Employee",
            function: emp.function || "General",
            division: emp.division || "Employee",
            location: emp.location || "Office",
            leaveTypesApplied: 0,
            avatar: null,
            joinedDate: emp.joinedDate || "N/A",
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            employeeNumber: emp.id,
            gender: emp.gender || "N/A",
            phoneNumber: emp.phoneNumber || "N/A",
            reportingManager: emp.reportingManager || "N/A",
            reportingManagerId: emp.reportingManager || null,
            assignmentStatus: emp.assignmentStatus || "Unassigned"
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

  // Handle search and filtering
  useEffect(() => {
    let filtered = allEmployees;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeNumber?.toString().includes(searchTerm)
      );
    }
    
    // Apply assignment status filter
    if (assignmentFilter !== "all") {
      filtered = filtered.filter(emp => emp.assignmentStatus === assignmentFilter);
    }
    
    setEmployees(filtered);
  }, [searchTerm, assignmentFilter, allEmployees]);

  // Show loading skeleton
  if (isLoadingEmployees) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
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

  // Show main employees list
  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-48">
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Unassigned Employees Alert */}
        {(() => {
          const unassignedCount = allEmployees.filter(emp => emp.assignmentStatus === 'Unassigned').length;
          if (unassignedCount > 0) {
            return (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>{unassignedCount}</strong> {unassignedCount === 1 ? 'employee has' : 'employees have'} no leave type assignments. Consider assigning leave types to ensure proper leave management.
                </AlertDescription>
              </Alert>
            );
          }
          return null;
        })()}

        {/* Employee Table */}
        <div className="bg-white rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">Employee ID</th>
                  <th className="text-left p-4 font-medium text-gray-900">Name</th>
                  <th className="text-left p-4 font-medium text-gray-900">Email</th>
                  <th className="text-left p-4 font-medium text-gray-900">Designation</th>
                  <th className="text-left p-4 font-medium text-gray-900">Reporting Manager</th>
                  <th className="text-left p-4 font-medium text-gray-900">Leave Type Assignment</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-900">{employee.id}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-900">{employee.email}</td>
                    <td className="p-4 text-sm text-gray-900">{employee.designation}</td>
                    <td className="p-4 text-sm text-gray-900">
                      {employee.reportingManager && employee.reportingManager !== "N/A" ? (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{employee.reportingManager}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No manager assigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={employee.assignmentStatus === 'Assigned' ? 'default' : 'secondary'}
                        className={employee.assignmentStatus === 'Assigned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      >
                        {employee.assignmentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No results */}
        {employees.length === 0 && !isLoadingEmployees && (
          <div className="text-center py-8">
            <p className="text-gray-500">No employees found.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
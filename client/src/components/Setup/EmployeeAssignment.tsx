import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  designation: string;
  dateOfJoining: string;
  userRole: string;
  workerType: string;
  profilePhoto: string | null;
  phoneNumber: string | null;
  dateOfBirth: string;
  gender: string;
  reportingManager: string | null;
  leaveId: string;
  isDifferentlyAbled: boolean;
  lastWorkingDay: string | null;
  user_id: string; // Keep for backward compatibility
  user_name: string; // Keep for backward compatibility
  employee_number: string; // Keep for backward compatibility
}

interface EmployeeAssignmentProps {
  onClose: () => void;
  onAssign: (selectedEmployees: Employee[]) => void;
  preSelectedEmployees?: any[];
  applicableGenders?: string[]; // Filter employees based on selected genders
}

// Function to fetch employees from external API
const fetchEmployeesFromAPI = async (): Promise<Employee[]> => {
  const { fetchEmployeeData, transformEmployeeData } = await import(
    "@/lib/externalApi"
  );

  try {
    const externalEmployees = await fetchEmployeeData();
    return externalEmployees.map(transformEmployeeData);
  } catch (error) {
    console.error("Failed to fetch employees from external API:", error);
    throw error;
  }
};

export default function EmployeeAssignment({
  onClose,
  onAssign,
  preSelectedEmployees = [],
  applicableGenders = [],
}: EmployeeAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Load employees from API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        console.log(
          "[EmployeeAssignment] Starting to load employees from external API...",
        );

        // Check if JWT token exists
        const token = localStorage.getItem("jwt_token");
        console.log("[EmployeeAssignment] JWT token available:", !!token);

        if (!token) {
          console.error(
            "[EmployeeAssignment] No JWT token found in localStorage",
          );
          console.log(
            "[EmployeeAssignment] To use external employee data, please:",
          );
          console.log("1. Obtain a JWT token from your system administrator");
          console.log("2. Visit /id/{your-jwt-token} to authenticate");
          console.log("3. Return to the setup wizard to assign employees");
          return;
        }

        const employeeData = await fetchEmployeesFromAPI();
        console.log(
          "[EmployeeAssignment] Loaded employees:",
          employeeData.length,
        );
        setEmployees(employeeData);
        setError(null);
      } catch (error) {
        console.error("[EmployeeAssignment] Error loading employees:", error);

        if (error instanceof Error && error.message.includes("JWT token")) {
          setError(
            "Authentication required. Please obtain a JWT token and visit /id/{your-jwt-token} to authenticate.",
          );
        } else {
          setError(
            "Failed to load employee data. Please try again or contact your administrator.",
          );
        }
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // Initialize selected employees from pre-selected
  useEffect(() => {
    if (
      preSelectedEmployees &&
      preSelectedEmployees.length > 0 &&
      employees.length > 0
    ) {
      const preSelected = preSelectedEmployees
        .map((preSelected: any) =>
          employees.find(
            (emp: Employee) => emp.user_id === preSelected.user_id,
          ),
        )
        .filter(Boolean) as Employee[];
      setSelectedEmployees(preSelected);
    }
  }, [preSelectedEmployees, employees]);

  const filteredEmployees = employees.filter((employee: Employee) => {
    if (!employee) return false;

    // Gender-based filtering
    if (applicableGenders.length > 0) {
      const employeeGender = (employee.gender || "").toLowerCase();
      const isGenderMatch = applicableGenders.some(
        (gender) => gender.toLowerCase() === employeeGender,
      );
      if (!isGenderMatch) return false;
    }

    // Search term filtering
    const searchLower = searchTerm.toLowerCase();
    return (
      (employee.user_name || "").toLowerCase().includes(searchLower) ||
      (employee.employee_number || "").toLowerCase().includes(searchLower) ||
      (employee.email || "").toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployees((prev) => {
      const isSelected = prev.find((emp) => emp.user_id === employee.user_id);
      if (isSelected) {
        return prev.filter((emp) => emp.user_id !== employee.user_id);
      } else {
        return [...prev, employee];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees);
    }
  };

  const handleAssign = () => {
    console.log(
      "EmployeeAssignment - handleAssign called with:",
      selectedEmployees,
    );
    console.log("Number of selected employees:", selectedEmployees.length);
    onAssign(selectedEmployees);
  };

  const isSelected = (employee: Employee) => {
    return selectedEmployees.some((emp) => emp.user_id === employee.user_id);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading employees...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <X className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">
                Unable to Load Employees
              </h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Retry loading
                  const loadEmployees = async () => {
                    try {
                      const employeeData = await fetchEmployeesFromAPI();
                      setEmployees(employeeData);
                      setError(null);
                    } catch (error) {
                      if (
                        error instanceof Error &&
                        error.message.includes("JWT token")
                      ) {
                        setError(
                          "Authentication required. Please obtain a JWT token and visit /id/{your-jwt-token} to authenticate.",
                        );
                      } else {
                        setError(
                          "Failed to load employee data. Please try again or contact your administrator.",
                        );
                      }
                      setEmployees([]);
                    } finally {
                      setLoading(false);
                    }
                  };
                  loadEmployees();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full">
      {/* Search and Filter */}
      <div className="p-4 border-b bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-auto min-h-[250px] max-h-[350px]">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedEmployees.length === filteredEmployees.length &&
                    filteredEmployees.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-700">
                Employee ID
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-700">
                Name
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-700">
                Email
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-700">
                Designation
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-700">
                Department
              </th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.map((employee: Employee) => (
              <tr
                key={employee.user_id}
                className={`border-b hover:bg-gray-50 transition-colors ${isSelected(employee) ? "bg-blue-50" : ""}`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={isSelected(employee)}
                    onChange={() => handleSelectEmployee(employee)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="p-4 text-sm text-gray-900 font-medium">
                  {employee.employee_number}
                </td>
                <td className="p-4 text-sm text-gray-900 font-medium">
                  {employee.user_name}
                </td>
                <td className="p-4 text-sm text-gray-600">{employee.email}</td>
                <td className="p-4 text-sm text-gray-600">
                  {employee.designation}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {employee.workerType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Showing {startIndex + 1}-
          {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
          {filteredEmployees.length} employees
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs px-2">
            {currentPage}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-gray-600 font-medium">
          {selectedEmployees.length} employee
          {selectedEmployees.length !== 1 ? "s" : ""} selected
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedEmployees.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Assign Selected ({selectedEmployees.length})
          </Button>
        </div>
      </div>
    </div>
  );
}

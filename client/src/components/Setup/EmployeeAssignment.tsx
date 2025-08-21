import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Filter, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  name?: string; // Optional name field for display
  // Additional fields from new API
  department?: string;
  location?: string;
  emp_status?: string;
}

// Filter interfaces
interface WorkerType {
  id: number;
  customer_worker_type: string;
}

interface Attribute {
  attribute_id: string;
  attribute: string;
}

interface SubAttribute {
  attribute_sub_id: string;
  attribute_sub: string;
}

interface FilterCondition {
  id: string;
  type: 'workerType' | 'attribute';
  attributeId?: string;
  attributeName?: string;
  selectedValues: string[];
  selectedLabels: string[];
}

interface FilterState {
  workerTypeIds: number[];
  attributeIds: string[];
  subAttributeIds: string[];
  userType: number; // 0 = Inactive, 1 = Active, 2 = All
  patternId?: number;
}

interface EmployeeAssignmentProps {
  onClose: () => void;
  onAssign: (selectedEmployees: Employee[]) => void;
  preSelectedEmployees?: any[];
  applicableGenders?: string[]; // Filter employees based on selected genders
}

// Function to fetch employees from new external API with filters
const fetchEmployeesFromAPI = async (filters?: FilterState): Promise<Employee[]> => {
  try {
    console.log('[ExternalAPI] Starting fetchEmployeeData with new API...');

    // Get JWT token from localStorage
    const jwtToken = localStorage.getItem('jwt_token');

    // Check if we're currently on the token setup route
    const isTokenSetupRoute = window.location.pathname.startsWith('/id/');

    if (!jwtToken || jwtToken.trim() === '' || jwtToken === 'null' || jwtToken === 'undefined') {
      if (isTokenSetupRoute) {
        console.log('[ExternalAPI] On token setup route, skipping redirect');
        throw new Error('JWT token being processed. Please wait...');
      }
      console.log('[ExternalAPI] Invalid or missing JWT token, redirecting to authentication...');
      window.location.href = 'https://services.resolvepay.in';
      throw new Error('JWT token required. Redirecting to authentication...');
    }

    console.log('[ExternalAPI] JWT token available:', !!jwtToken);
    console.log('[ExternalAPI] Applying filters:', filters);

    // Prepare payload with new AttributeFilters structure
    const attributeFilters: Array<{attributeId: number; subAttributeId: number[]}> = [];
    const attributeIds = filters?.attributeIds || [];
    const subAttributeIds = filters?.subAttributeIds || [];

    // Group subAttributeIds by their corresponding attributeId
    // Assuming attributeIds and subAttributeIds arrays have corresponding indices
    if (attributeIds.length > 0 && subAttributeIds.length > 0) {
      // Create a map to group subAttributeIds by attributeId
      const attributeMap: { [key: string]: number[] } = {};

      // If arrays have same length, pair them up
      if (attributeIds.length === subAttributeIds.length) {
        attributeIds.forEach((attrId, index) => {
          const attributeIdNum = parseInt(attrId);
          const subAttrIdNum = parseInt(subAttributeIds[index]);

          if (!attributeMap[attributeIdNum]) {
            attributeMap[attributeIdNum] = [];
          }
          attributeMap[attributeIdNum].push(subAttrIdNum);
        });
      } else {
        // If lengths don't match, group all subAttributeIds under the first attributeId
        const firstAttrId = parseInt(attributeIds[0]);
        attributeMap[firstAttrId] = subAttributeIds.map(id => parseInt(id));
      }

      // Convert map to AttributeFilters array
      Object.keys(attributeMap).forEach(attributeId => {
        attributeFilters.push({
          attributeId: parseInt(attributeId),
          subAttributeId: attributeMap[attributeId]
        });
      });
    }

    const payload = {
      "workerTypeId": filters?.workerTypeIds || [],
      "AttributeFilters": attributeFilters,
      "isActive": filters?.userType ?? 2, // 0 = Inactive, 1 = Active, 2 = All
      "patternId": filters?.patternId || 0
    };

    console.log('[ExternalAPI] New payload structure:');
    console.log('- workerTypeId:', payload.workerTypeId);
    console.log('- AttributeFilters:', payload.AttributeFilters);
    console.log('- isActive:', payload.isActive);
    console.log('- patternId:', payload.patternId);
    console.log('[ExternalAPI] Full request payload:', JSON.stringify(payload, null, 2));

    // Call the new employees API endpoint
    const response = await fetch('https://qa-api.resolveindia.com/organization/employees?page=1&pageSize=0', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const apiData = await response.json();
    console.log('[ExternalAPI] New API response:', apiData);

    if (!apiData || apiData.result !== 'Success' || !apiData.data || !Array.isArray(apiData.data.employee_data)) {
      throw new Error('Invalid employee data format received from new API');
    }

    // Transform the new API data to match our Employee interface
    const transformedData: Employee[] = apiData.data.employee_data.map((emp: any) => ({
      id: emp.user_id.toString(),
      firstName: emp.user_name.split(' ')[0] || emp.user_name,
      lastName: emp.user_name.split(' ').slice(1).join(' ') || '',
      email: `${emp.user_name.toLowerCase().replace(/\s+/g, '.')}@company.com`, // Generate email since not provided
      employeeNumber: emp.employee_number,
      designation: emp.designation || 'Not Assigned',
      dateOfJoining: emp.date_of_joining,
      userRole: 'employee',
      workerType: emp.worker_type,
      profilePhoto: null,
      phoneNumber: null,
      dateOfBirth: '1990-01-01', // Default since not provided
      gender: 'Not Specified',
      reportingManager: null,
      leaveId: `leave_${emp.user_id}`,
      isDifferentlyAbled: false,
      lastWorkingDay: emp.last_working_day || null,
      user_id: emp.user_id.toString(),
      user_name: emp.user_name,
      employee_number: emp.employee_number,
      department: emp.department,
      location: emp.location,
      emp_status: emp.emp_status,
    }));

    console.log('[ExternalAPI] Transformed employee data from new API:', transformedData);
    return transformedData;

  } catch (error) {
    console.error('[ExternalAPI] Error fetching employees from new API:', error);
    throw error;
  }
};

// Function to fetch worker types
const fetchWorkerTypes = async (): Promise<WorkerType[]> => {
  try {
    const jwtToken = localStorage.getItem('jwt_token');
    if (!jwtToken) {
      throw new Error('JWT token required');
    }

    const response = await fetch('https://qa-api.resolveindia.com/organization/customer/worker-type-list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Worker types API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FilterAPI] Worker types response:', data);

    if (data.result === 'Success' && data.worker_type_list) {
      return data.worker_type_list;
    }

    return [];
  } catch (error) {
    console.error('[FilterAPI] Error fetching worker types:', error);
    return [];
  }
};

// Function to fetch attributes (Location, Department, etc.)
const fetchAttributes = async (): Promise<Attribute[]> => {
  try {
    const jwtToken = localStorage.getItem('jwt_token');
    if (!jwtToken) {
      throw new Error('JWT token required');
    }

    const response = await fetch('https://qa-api.resolveindia.com/organization/attribute-list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Attributes API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FilterAPI] Attributes response:', data);

    if (data.result === 'Success' && data.attributes) {
      return data.attributes;
    }

    return [];
  } catch (error) {
    console.error('[FilterAPI] Error fetching attributes:', error);
    return [];
  }
};

// Function to fetch sub-attributes for a specific attribute
const fetchSubAttributes = async (attributeId: string): Promise<SubAttribute[]> => {
  try {
    const jwtToken = localStorage.getItem('jwt_token');
    if (!jwtToken) {
      throw new Error('JWT token required');
    }

    const response = await fetch(`https://qa-api.resolveindia.com/organization/attribute-details/${attributeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Sub-attributes API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FilterAPI] Sub-attributes response for', attributeId, ':', data);

    if (data.result === 'Success' && data.sub_attributes) {
      return data.sub_attributes;
    }

    return [];
  } catch (error) {
    console.error('[FilterAPI] Error fetching sub-attributes for', attributeId, ':', error);
    return [];
  }
};

export default function EmployeeAssignment({ onClose, onAssign, preSelectedEmployees = [], applicableGenders = [] }: EmployeeAssignmentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Filter state
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [subAttributes, setSubAttributes] = useState<Record<string, SubAttribute[]>>({});
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    workerTypeIds: [],
    attributeIds: [],
    subAttributeIds: [],
    userType: 2 // Default to "All"
  });

  // User Type filter state
  const [selectedUserType, setSelectedUserType] = useState<number>(2); // 0 = Inactive, 1 = Active, 2 = All

  // Load employees from API
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        console.log('[EmployeeAssignment] Starting to load employees from external API...');

        // Check if JWT token exists
        const token = localStorage.getItem('jwt_token');
        console.log('[EmployeeAssignment] JWT token available:', !!token);

        if (!token) {
          console.log('[EmployeeAssignment] No JWT token found');
          setError('JWT token required. Please obtain a JWT token and visit /id/{your-jwt-token} to authenticate.');
          setLoading(false);
          return;
        }

        const employeeData = await fetchEmployeesFromAPI(activeFilters);
        console.log('[EmployeeAssignment] Loaded employees:', employeeData.length);
        setEmployees(employeeData);
        setError(null);
      } catch (error) {
        console.error('[EmployeeAssignment] Error loading employees:', error);

        // Fallback to sample employees if external API fails
        console.log('[EmployeeAssignment] Falling back to sample employees');
        const sampleEmployees: Employee[] = [
          {
            id: '225',
            user_id: '225',
            firstName: 'John',
            lastName: 'Doe',
            user_name: 'John Doe',
            email: 'john.doe@company.com',
            employeeNumber: 'EMP001',
            employee_number: 'EMP001',
            designation: 'Software Engineer',
            dateOfJoining: '2023-01-15',
            userRole: 'employee',
            workerType: 'regular',
            profilePhoto: null,
            phoneNumber: '+1-555-0101',
            dateOfBirth: '1990-05-15',
            gender: 'Male',
            reportingManager: null,
            leaveId: '225',
            isDifferentlyAbled: false,
            lastWorkingDay: null
          },
          {
            id: '226',
            user_id: '226',
            firstName: 'Jane',
            lastName: 'Smith',
            user_name: 'Jane Smith',
            email: 'jane.smith@company.com',
            employeeNumber: 'EMP002',
            employee_number: 'EMP002',
            designation: 'Project Manager',
            dateOfJoining: '2022-08-10',
            userRole: 'manager',
            workerType: 'regular',
            profilePhoto: null,
            phoneNumber: '+1-555-0102',
            dateOfBirth: '1988-12-20',
            gender: 'Female',
            reportingManager: null,
            leaveId: '226',
            isDifferentlyAbled: false,
            lastWorkingDay: null
          }
        ];

        setEmployees(sampleEmployees);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [activeFilters]);

  // Load filter data (worker types and attributes) when dialog opens
  useEffect(() => {
    if (showFilterDialog) {
      const loadFilterData = async () => {
        try {
          const [workerTypesData, attributesData] = await Promise.all([
            fetchWorkerTypes(),
            fetchAttributes()
          ]);

          setWorkerTypes(workerTypesData);
          setAttributes(attributesData);
          console.log('[FilterAPI] Loaded filter data:', { workerTypesData, attributesData });
        } catch (error) {
          console.error('[FilterAPI] Error loading filter data:', error);
        }
      };

      loadFilterData();
    }
  }, [showFilterDialog]);

  // Initialize selected employees from pre-selected
  useEffect(() => {
    if (preSelectedEmployees && preSelectedEmployees.length > 0 && employees.length > 0) {
      const preSelected = preSelectedEmployees.map((preSelected: any) => 
        employees.find((emp: Employee) => emp.user_id === preSelected.user_id)
      ).filter(Boolean) as Employee[];
      setSelectedEmployees(preSelected);
    }
  }, [preSelectedEmployees, employees]);

  const filteredEmployees = employees.filter((employee: Employee) => {
    if (!employee) return false;

    // Gender-based filtering - only apply if we have specific gender requirements
    // If applicableGenders is empty array, skip gender filtering entirely (used for BTO variants)
    if (applicableGenders && applicableGenders.length > 0) {
      const employeeGender = (employee.gender || '').toLowerCase();

      // If employee gender is "not specified" or empty, include them in all gender filters
      // This allows unspecified gender employees to be assigned to any leave type
      if (employeeGender === 'not specified' || employeeGender === '' || !employeeGender) {
        // Include employees with unspecified gender
      } else {
        // For employees with specified gender, check if it matches the filter
        const isGenderMatch = applicableGenders.some(gender => 
          gender.toLowerCase() === employeeGender
        );
        if (!isGenderMatch) return false;
      }
    }

    // Search term filtering
    const searchLower = searchTerm.toLowerCase();
    return (
      (employee.user_name || '').toLowerCase().includes(searchLower) ||
      (employee.employee_number || '').toLowerCase().includes(searchLower) ||
      (employee.email || '').toLowerCase().includes(searchLower)
    );
  });

  // Debug logging for filtering issues
  if (employees.length > 0 && filteredEmployees.length === 0) {
    console.log('[EmployeeAssignment] FILTER DEBUG - All employees filtered out!');
    console.log('- Total employees:', employees.length);
    console.log('- Applicable genders:', applicableGenders);
    console.log('- Search term:', searchTerm);
    console.log('- Sample employee gender:', employees[0]?.gender);
  }

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.find(emp => emp.user_id === employee.user_id);
      if (isSelected) {
        return prev.filter(emp => emp.user_id !== employee.user_id);
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
    console.log("EmployeeAssignment - handleAssign called with:", selectedEmployees);
    console.log("Number of selected employees:", selectedEmployees.length);
    onAssign(selectedEmployees);
  };

  const isSelected = (employee: Employee) => {
    return selectedEmployees.some(emp => emp.user_id === employee.user_id);
  };

  // Filter handlers
  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      type: 'workerType',
      selectedValues: [],
      selectedLabels: []
    };
    setFilterConditions([...filterConditions, newCondition]);
  };

  const removeFilterCondition = (id: string) => {
    setFilterConditions(filterConditions.filter(condition => condition.id !== id));
  };

  const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
    setFilterConditions(filterConditions.map(condition => 
      condition.id === id ? { ...condition, ...updates } : condition
    ));
  };

  const handleAttributeSelection = async (conditionId: string, attributeId: string, attributeName: string) => {
    updateFilterCondition(conditionId, {
      type: 'attribute',
      attributeId,
      attributeName,
      selectedValues: [],
      selectedLabels: []
    });

    // Fetch sub-attributes for this attribute
    if (!subAttributes[attributeId]) {
      try {
        const subAttributesData = await fetchSubAttributes(attributeId);
        setSubAttributes(prev => ({
          ...prev,
          [attributeId]: subAttributesData
        }));
      } catch (error) {
        console.error('Error fetching sub-attributes:', error);
      }
    }
  };

  const applyFilters = () => {
    const workerTypeIds: number[] = [];
    const attributeIds: string[] = [];
    const subAttributeIds: string[] = [];

    filterConditions.forEach(condition => {
      if (condition.type === 'workerType' && condition.selectedValues.length > 0) {
        workerTypeIds.push(...condition.selectedValues.map(v => parseInt(v)));
      } else if (condition.type === 'attribute' && condition.selectedValues.length > 0) {
        if (condition.attributeId) {
          attributeIds.push(condition.attributeId);
          subAttributeIds.push(...condition.selectedValues);
        }
      }
    });

    setActiveFilters({
      workerTypeIds,
      attributeIds,
      subAttributeIds,
      userType: selectedUserType
    });

    setShowFilterDialog(false);
    console.log('[Filter] Applied filters:', { workerTypeIds, attributeIds, subAttributeIds, userType: selectedUserType });
  };

  const clearFilters = () => {
    setFilterConditions([]);
    setSelectedUserType(2); // Reset to "All Users"
    setActiveFilters({
      workerTypeIds: [],
      attributeIds: [],
      subAttributeIds: [],
      userType: 2
    });
    setShowFilterDialog(false);
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
              <h3 className="text-lg font-semibold">Unable to Load Employees</h3>
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
                      if (error instanceof Error && error.message.includes('JWT token')) {
                        setError('Authentication required. Please obtain a JWT token and visit /id/{your-jwt-token} to authenticate.');
                      } else {
                        setError('Failed to load employee data. Please try again or contact your administrator.');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Assign Employees</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter Employees</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* User Type Filter - Always visible */}
                  <div className="flex items-center gap-2 p-4 border rounded-lg bg-blue-50">
                    <span className="text-sm text-gray-500 min-w-12">Show</span>
                    <Select
                      value={selectedUserType.toString()}
                      onValueChange={(value) => {
                        const userType = parseInt(value);
                        setSelectedUserType(userType);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">All Users</SelectItem>
                        <SelectItem value="1">Active Users</SelectItem>
                        <SelectItem value="0">Inactive Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-500">employees</span>
                  </div>

                  {filterConditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center gap-2 p-4 border rounded-lg">
                      <span className="text-sm text-gray-500 min-w-12">
                        {index === 0 ? 'Where' : 'And'}
                      </span>

                      {/* Filter Type Selection */}
                      <Select
                        value={condition.type === 'workerType' ? 'workerType' : condition.attributeName || ''}
                        onValueChange={(value) => {
                          if (value === 'workerType') {
                            updateFilterCondition(condition.id, {
                              type: 'workerType',
                              attributeId: undefined,
                              attributeName: undefined,
                              selectedValues: [],
                              selectedLabels: []
                            });
                          } else {
                            const attribute = attributes.find(attr => attr.attribute === value);
                            if (attribute) {
                              handleAttributeSelection(condition.id, attribute.attribute_id, attribute.attribute);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select filter type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workerType">Worker Type</SelectItem>
                          {attributes.map(attr => (
                            <SelectItem key={attr.attribute_id} value={attr.attribute}>
                              {attr.attribute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-sm text-gray-500">is</span>

                      {/* Value Selection */}
                      <Select
                        value=""
                        onValueChange={(value) => {
                          const currentValues = condition.selectedValues || [];
                          const currentLabels = condition.selectedLabels || [];

                          if (condition.type === 'workerType') {
                            const workerType = workerTypes.find(wt => wt.id.toString() === value);
                            if (workerType && !currentValues.includes(value)) {
                              updateFilterCondition(condition.id, {
                                selectedValues: [...currentValues, value],
                                selectedLabels: [...currentLabels, workerType.customer_worker_type]
                              });
                            }
                          } else if (condition.type === 'attribute' && condition.attributeId) {
                            const subAttributeList = subAttributes[condition.attributeId] || [];
                            const subAttribute = subAttributeList.find(sub => sub.attribute_sub_id === value);
                            if (subAttribute && !currentValues.includes(value)) {
                              updateFilterCondition(condition.id, {
                                selectedValues: [...currentValues, value],
                                selectedLabels: [...currentLabels, subAttribute.attribute_sub]
                              });
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={
                            condition.selectedLabels && condition.selectedLabels.length > 0
                              ? `${condition.selectedLabels.length} selected`
                              : condition.type === 'workerType' 
                                ? 'Select worker types'
                                : condition.attributeId && subAttributes[condition.attributeId]
                                  ? `Select ${condition.attributeName?.toLowerCase()}s`
                                  : 'Loading options...'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {condition.type === 'workerType' ? 
                            workerTypes.map(workerType => (
                              <SelectItem key={workerType.id} value={workerType.id.toString()}>
                                {workerType.customer_worker_type}
                              </SelectItem>
                            ))
                            : condition.attributeId && subAttributes[condition.attributeId] ?
                              subAttributes[condition.attributeId].map(subAttr => (
                                <SelectItem key={subAttr.attribute_sub_id} value={subAttr.attribute_sub_id}>
                                  {subAttr.attribute_sub}
                                </SelectItem>
                              ))
                              : null
                          }
                        </SelectContent>
                      </Select>

                      {/* Selected Values Display */}
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {condition.selectedLabels?.map((label, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                            {label}
                            <button
                              onClick={() => {
                                const newValues = [...(condition.selectedValues || [])];
                                const newLabels = [...(condition.selectedLabels || [])];
                                newValues.splice(idx, 1);
                                newLabels.splice(idx, 1);
                                updateFilterCondition(condition.id, {
                                  selectedValues: newValues,
                                  selectedLabels: newLabels
                                });
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Remove Condition Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilterCondition(condition.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Filter Button */}
                  <Button 
                    variant="outline" 
                    onClick={addFilterCondition}
                    className="w-full"
                  >
                    + Add Filter Condition
                  </Button>

                  {/* Apply/Clear Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={clearFilters}>
                      Clear
                    </Button>
                    <Button onClick={applyFilters} className="flex-1">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">Employee ID</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">Designation</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">Department</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.map((employee: Employee) => (
                <tr
                  key={employee.user_id}
                  className={`border-b hover:bg-gray-50 transition-colors ${isSelected(employee) ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected(employee)}
                      onChange={() => handleSelectEmployee(employee)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="p-4 text-sm text-gray-900 font-medium">{employee.employee_number}</td>
                  <td className="p-4 text-sm text-gray-900 font-medium">{employee.user_name}</td>
                  <td className="p-4 text-sm text-gray-600">{employee.email}</td>
                  <td className="p-4 text-sm text-gray-600">{employee.designation}</td>
                  <td className="p-4 text-sm text-gray-600">{employee.department || employee.workerType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600 font-medium">
            {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
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
    </div>
  );
}
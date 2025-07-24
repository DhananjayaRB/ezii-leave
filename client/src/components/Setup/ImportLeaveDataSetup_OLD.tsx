import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { fetchEmployeeData, transformEmployeeData } from '@/lib/externalApi';

interface ImportLeaveDataSetupProps {
  onNext: () => void;
  onPrevious: () => void;
  isLast?: boolean;
  isLoading?: boolean;
}

export default function ImportLeaveDataSetup({ onNext, onPrevious, isLast, isLoading }: ImportLeaveDataSetupProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>("balances");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState(false);

  const { toast } = useToast();

  // Fetch company data to get effective date
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Fetch leave types for validation
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData([]);
      setValidationErrors([]);
      setIsValidated(false);
      
      // Enhanced file type validation
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
      ];
      
      const fileName = file.name.toLowerCase();
      const isValidType = validTypes.includes(file.type) || 
                         fileName.endsWith('.csv') || 
                         fileName.endsWith('.xls') || 
                         fileName.endsWith('.xlsx');
      
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV or Excel file (.csv, .xls, .xlsx)",
          variant: "destructive",
        });
        setSelectedFile(null);
        return;
      }
    }
  };

  // Parse and validate file
  const validateFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', importType);
      
      const response = await apiRequest("POST", "/api/import-leave-data/validate", formData);
      return response.json();
    },
    onSuccess: (response: any) => {
      setPreviewData(response.preview || []);
      setValidationErrors(response.errors || []);
      setIsValidated((response.errors || []).length === 0);
      
      if ((response.errors || []).length === 0) {
        toast({
          title: "Validation Successful",
          description: `File validated successfully. Found ${(response.preview || []).length} records.`,
        });
      } else {
        toast({
          title: "Validation Issues Found",
          description: `Found ${(response.errors || []).length} validation errors. Please review.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate file",
        variant: "destructive",
      });
    },
  });

  // Import data mutation
  const importDataMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('importType', importType);
      
      const response = await apiRequest("POST", "/api/import-leave-data/execute", formData);
      return response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance-transactions"] });
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${response.imported || 0} records.`,
      });
      
      // Reset form
      setSelectedFile(null);
      setPreviewData([]);
      setValidationErrors([]);
      setIsValidated(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    },
  });

  // Download balance template
  const handleDownloadBalanceTemplate = async () => {
    await downloadTemplate("balances");
  };

  // Download transaction template
  const handleDownloadTransactionTemplate = async () => {
    await downloadTemplate("transactions");
  };

  const downloadTemplate = async (templateType: string) => {
    try {
      let employees: any[] = [];
      
      // Fetch employee data using the same approach as other components
      try {
        console.log('[ImportLeaveDataSetup] Fetching employee data from external API...');
        const externalEmployees = await fetchEmployeeData();
        employees = externalEmployees.map(transformEmployeeData);
        console.log('[ImportLeaveDataSetup] Successfully fetched:', employees.length, 'employees');
      } catch (apiError) {
        console.log('[ImportLeaveDataSetup] External API error:', apiError);
        // Continue with empty employees array to generate template with empty fields
      }
      
      // If no employees from external API, show warning
      if (employees.length === 0) {
        console.log('No employee data available, generating template with empty employee fields');
        toast({
          title: "No Employee Data",
          description: "Could not fetch employee data from external API. Template will have empty employee fields.",
          variant: "default",
        });
      }
      
      let templateData: any[] = [];
      
      if (templateType === "balances") {
        templateData = [
          ["Leave balance details for the current calendar year as on migration"],
          [],
          ["EmpNumber", "EmpName", "LeaveType", "LeaveOpeningBalance", "LeaveEncashed", "LeaveLapsed"]
        ];
      } else {
        templateData = [
          ["Leave availed details from the beginning of the current calendar year till migration cut off date"],
          [],
          ["EmpNumber", "EmpName", "LeaveType", "StartDate", "EndDate", "Days", "Status"]
        ];
        
        // For transaction imports, only include column headers - no employee data
        console.log('[ImportLeaveDataSetup] Transaction template: Only including column headers, no employee data');
        
        // Create Excel with just headers and download immediately
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths for transaction template
        ws['!cols'] = [
          { wch: 12 }, // EmpNumber
          { wch: 20 }, // EmpName
          { wch: 15 }, // LeaveType
          { wch: 12 }, // StartDate
          { wch: 12 }, // EndDate
          { wch: 8 },  // Days
          { wch: 10 }  // Status
        ];

        // Style the header row
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }); // Merge title row (7 columns)

        const sheetName = "Leave Transaction Import";
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Generate Excel file and download
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leave_transaction_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Template Downloaded", 
          description: "Transaction template with column headers only",
        });
        return; // Exit early for transaction templates
      }

      const typedLeaveTypes = leaveTypes as Array<{name: string}>;
      
      if (employees.length > 0) {
        // Only include employees who are actually assigned to each leave type
        for (const leaveType of typedLeaveTypes) {
          try {
            // Fetch leave variants for this leave type
            const currentOrgId = localStorage.getItem('org_id') || '38';
            console.log(`[ImportLeaveDataSetup] Fetching variants for leave type ${leaveType.name} with org_id: ${currentOrgId}`);
            
            const variantsResponse = await fetch('/api/leave-variants', {
              credentials: 'include',
              headers: {
                'X-Org-Id': currentOrgId
              }
            });
            
            if (variantsResponse.ok) {
              const allVariants = await variantsResponse.json();
              const typeVariants = allVariants.filter((v: any) => v.leaveTypeName === leaveType.name);
              console.log(`[ImportLeaveDataSetup] Found ${typeVariants.length} variants for leave type ${leaveType.name}:`, typeVariants.map(v => `ID: ${v.id}`));
              
              // Get assigned employees for each variant of this leave type
              const assignedEmployeeIds = new Set();
              
              for (const variant of typeVariants) {
                try {
                  console.log(`[ImportLeaveDataSetup] Fetching assignments for variant ${variant.id}`);
                  const assignmentsResponse = await fetch(`/api/employee-assignments/${variant.id}`, {
                    credentials: 'include'
                  });
                  
                  if (assignmentsResponse.ok) {
                    const assignments = await assignmentsResponse.json();
                    console.log(`[ImportLeaveDataSetup] Found ${assignments.length} assignments for variant ${variant.id}:`, assignments);
                    assignments.forEach((assignment: any) => {
                      assignedEmployeeIds.add(assignment.userId);
                    });
                  } else {
                    console.log(`[ImportLeaveDataSetup] Failed to fetch assignments for variant ${variant.id}:`, assignmentsResponse.status);
                  }
                } catch (error) {
                  console.log(`[ImportLeaveDataSetup] Error fetching assignments for variant ${variant.id}:`, error);
                }
              }
              
              console.log(`[ImportLeaveDataSetup] Total assigned employee IDs for ${leaveType.name}:`, Array.from(assignedEmployeeIds));
              
              // Only add rows for employees assigned to this leave type who have employee numbers
              console.log(`[ImportLeaveDataSetup] Processing ${employees.length} employees for leave type ${leaveType.name}`);
              let addedEmployeesCount = 0;
              
              employees.forEach((employee: any) => {
                const empId = employee.user_id || employee.id;
                const employeeNumber = employee.employeeNumber || employee.employee_number;
                const employeeName = employee.user_name || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || "";
                
                console.log(`[ImportLeaveDataSetup] Checking employee: ID=${empId}, Number=${employeeNumber}, Name=${employeeName}, Assigned=${assignedEmployeeIds.has(empId)}`);
                
                if (assignedEmployeeIds.has(empId) && employeeNumber) {
                  addedEmployeesCount++;
                  console.log(`[ImportLeaveDataSetup] Adding employee ${employeeName} (${employeeNumber}) to ${leaveType.name} template`);
                  
                  if (templateType === "balances") {
                    // Balance template - without LeaveAvailed column
                    templateData.push([
                      employeeNumber,
                      employeeName,
                      leaveType.name,
                      "", // LeaveOpeningBalance - empty for user to fill
                      "", // LeaveEncashed - empty for user to fill
                      ""  // LeaveLapsed - empty for user to fill
                    ]);
                  } else {
                    templateData.push([
                      employeeNumber,
                      employeeName,
                      leaveType.name,
                      "", // StartDate - empty for user to fill
                      "", // EndDate - empty for user to fill
                      "", // Days - empty for user to fill
                      "approved" // Status - default to approved
                    ]);
                  }
                }
              });
              
              console.log(`[ImportLeaveDataSetup] Added ${addedEmployeesCount} employees for leave type ${leaveType.name}`);
            }
          } catch (error) {
            console.log(`Error processing leave type ${leaveType.name}:`, error);
          }
        }
      } else {
        // Create sample rows for manual entry when no employee data available
        typedLeaveTypes.forEach((leaveType) => {
          if (templateType === "balances") {
            // Balance template - without LeaveAvailed column
            templateData.push([
              "EMP001", // Sample EmpNumber format
              "Sample Employee", // Sample EmpName
              leaveType.name,
              "", // LeaveOpeningBalance - empty for user to fill
              "", // LeaveEncashed - empty for user to fill
              ""  // LeaveLapsed - empty for user to fill
            ]);
          } else {
            templateData.push([
              "EMP001", // Sample EmpNumber format
              "Sample Employee", // Sample EmpName
              leaveType.name,
              "", // StartDate - empty for user to fill (YYYY-MM-DD)
              "", // EndDate - empty for user to fill (YYYY-MM-DD)
              "", // Days - empty for user to fill
              "approved" // Status - default to approved
            ]);
          }
        });
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths based on template type
      if (templateType === "balances") {
        // Balance template - without LeaveAvailed column
        ws['!cols'] = [
          { wch: 12 }, // EmpNumber
          { wch: 20 }, // EmpName
          { wch: 15 }, // LeaveType
          { wch: 18 }, // LeaveOpeningBalance
          { wch: 14 }, // LeaveEncashed
          { wch: 12 }  // LeaveLapsed
        ];
      } else {
        ws['!cols'] = [
          { wch: 12 }, // EmpNumber
          { wch: 20 }, // EmpName
          { wch: 15 }, // LeaveType
          { wch: 12 }, // StartDate
          { wch: 12 }, // EndDate
          { wch: 8 },  // Days
          { wch: 10 }  // Status
        ];
      }

      // Style the header row
      if (!ws['!merges']) ws['!merges'] = [];
      let colCount = 6; // Default for transaction template
      if (templateType === "balances") {
        colCount = 6; // Balance template has 6 columns (without LeaveAvailed)
      }
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount } }); // Merge title row

      const sheetName = templateType === "balances" ? "Leave Balance Import" : "Leave Transaction Import";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate Excel file and download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = templateType === "balances" ? 'leave_balance_import_template.xlsx' : 'leave_transaction_import_template.xlsx';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const rowCount = templateData.length - 3; // Subtract header rows
      const message = employees.length > 0 
        ? `Generated template with ${rowCount} rows based on actual employee assignments`
        : `Generated empty template with ${typedLeaveTypes.length} leave types - fill in employee data manually`;
      
      toast({
        title: "Template Downloaded", 
        description: message,
      });
    } catch (error) {
      console.error('Template generation error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to generate template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Import Leave Data</h2>
        <p className="text-gray-600 mt-1">Import employee leave balances and transaction history</p>
      </div>

      {/* Import Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Import Type Selection */}
            <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Select Template Type
              </Label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    value="balances"
                    checked={importType === "balances"}
                    onChange={(e) => setImportType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-900">Balance Template</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    value="transactions"
                    checked={importType === "transactions"}
                    onChange={(e) => setImportType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-900">Transaction Template</span>
                </label>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              {importType === "balances" ? (
                <>
                  <p>Import employee leave balance data from your previous system.</p>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Required Format for Leave Balances:</h4>
                    <ul className="text-blue-800 space-y-1">
                      <li>• <strong>EmpNumber:</strong> Employee ID (e.g., HIN/00001)</li>
                      <li>• <strong>EmpName:</strong> Employee full name</li>
                      <li>• <strong>LeaveType:</strong> Leave type code (EL, CL, SL, etc.)</li>
                      <li>• <strong>LeaveOpeningBalance:</strong> Current available balance</li>
                      <li>• <strong>LeaveEncashed:</strong> Amount encashed (if applicable)</li>
                      <li>• <strong>LeaveLapsed:</strong> Amount that expired/lapsed</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p>Import historical leave transactions that employees have already taken.</p>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Required Format for Leave Transactions:</h4>
                    <ul className="text-green-800 space-y-1">
                      <li>• <strong>EmpNumber:</strong> Employee ID (e.g., HIN/00001)</li>
                      <li>• <strong>EmpName:</strong> Employee full name</li>
                      <li>• <strong>LeaveType:</strong> Leave type code (EL, CL, SL, etc.)</li>
                      <li>• <strong>StartDate:</strong> Leave start date (dd-MM-YYYY)</li>
                      <li>• <strong>EndDate:</strong> Leave end date (dd-MM-YYYY)</li>
                      <li>• <strong>Days:</strong> Number of leave days taken</li>
                      <li>• <strong>Status:</strong> Approved/1 (deducts balance), Rejected/0 (no deduction), or Pending/2 (no deduction)</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upload Data File</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleDownloadBalanceTemplate}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Balance Template</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadTransactionTemplate}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Transaction Template</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                Select Excel or CSV file
              </Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <Input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv,.xls,.xlsx"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV, XLS, XLSX up to 10MB</p>
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => validateFileMutation.mutate(selectedFile)}
                    disabled={validateFileMutation.isPending}
                  >
                    {validateFileMutation.isPending ? "Validating..." : "Validate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewData([]);
                      setValidationErrors([]);
                      setIsValidated(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Validation Errors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Data */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Data Preview ({previewData.length} records)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <th key={key} className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {value?.toString() || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 5 rows of {previewData.length} total records
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Actions */}
      {isValidated && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">File validated successfully</span>
              </div>
              <Button
                onClick={() => importDataMutation.mutate()}
                disabled={importDataMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{importDataMutation.isPending ? "Importing..." : "Import Data"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLast ? "Finish Setup" : "Next"}
        </Button>
      </div>
    </div>
  );
}
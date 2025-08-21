import { getStoredJWTToken } from "./jwtUtils";

const EXTERNAL_API_BASE_URL = "https://qa-api.resolveindia.com";

export interface ExternalEmployee {
  employee_number: string;
  user_name: string;
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  communication_email: string;
  Mobile_number_1: string;
  Mobile_number_2: string;
  date_of_joining: string;
  last_working_day: string;
  gender_name: string;
  date_of_birth: string;
  user_role_name: string;
  worker_type: string;
  user_profile: string;
  is_differently_abled: string;
  leave_id: string;
  band_name: string;
  level_name: string;
  designation_name: string;
  vendor_name: string;
  type_id_0: string;
  type_id_1: string;
  reporting_manager_id?: string;
}

export interface WorkerMasterResponse {
  result: string;
  statuscode: number;
  message: string;
  data: {
    column: Array<{
      text: string;
      dataField: string;
      formula: string | null;
    }>;
    data: ExternalEmployee[];
  };
}

export async function fetchEmployeeData(): Promise<ExternalEmployee[]> {
  console.log("[ExternalAPI] Starting fetchEmployeeData...");

  // Get current JWT token from localStorage
  const token = localStorage.getItem("jwt_token");

  console.log("[ExternalAPI] JWT token available:", !!token);
  console.log("[ExternalAPI] Token length:", token?.length || 0);
  console.log("[ExternalAPI] Token preview:", token?.substring(0, 50) + "...");
  console.log("[ExternalAPI] Full Authorization header:", `Bearer ${token}`);

  // Check if we're currently on the token setup route
  const isTokenSetupRoute = window.location.pathname.startsWith("/id/");

  if (
    !token ||
    token.trim() === "" ||
    token === "null" ||
    token === "undefined"
  ) {
    if (isTokenSetupRoute) {
      console.log("[ExternalAPI] On token setup route, skipping redirect");
      throw new Error("JWT token being processed. Please wait...");
    }
    console.error(
      "[ExternalAPI] Invalid or missing JWT token, redirecting to authentication...",
    );
    console.log(
      "[ExternalAPI] Available localStorage keys:",
      Object.keys(localStorage),
    );
    window.location.href = "https://services.resolvepay.in";
    throw new Error("JWT token required. Redirecting to authentication...");
  }

  const payload = {
    userBlocks: [1, 3, 4],
    userWise: 0,
    workerType: 0,
    attribute: 0,
    subAttributeId: 0,
  };

  try {
    console.log(
      "[ExternalAPI] Making request to worker-master-leave endpoint...",
    );
    console.log("[ExternalAPI] Payload:", payload);

    const response = await fetch(
      `${EXTERNAL_API_BASE_URL}/reports/worker-master-leave`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    console.log("[ExternalAPI] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ExternalAPI] Response error:", errorText);
      throw new Error(
        `Failed to fetch employee data: ${response.status} ${response.statusText}`,
      );
    }

    const data: WorkerMasterResponse = await response.json();
    console.log("[ExternalAPI] Response data:", data);

    if (data.result !== "Success") {
      console.error("[ExternalAPI] API returned error:", data.message);
      throw new Error(`API returned error: ${data.message}`);
    }

    console.log(
      `[ExternalAPI] Successfully fetched ${data.data.data.length} employees from external API`,
    );
    return data.data.data;
  } catch (error) {
    console.error("[ExternalAPI] Error fetching employee data:", error);
    throw error;
  }
}

// Transform external employee data to our internal format
export function transformEmployeeData(externalEmployee: ExternalEmployee) {
  try {
    const transformed = {
      id: externalEmployee.user_id || "N/A",
      firstName: externalEmployee.first_name || "",
      lastName: externalEmployee.last_name || "",
      email: externalEmployee.email || "",
      employeeNumber: externalEmployee.employee_number || "",
      designation: externalEmployee.designation_name || "Employee",
      dateOfJoining: externalEmployee.date_of_joining || null,
      userRole: externalEmployee.user_role_name || "General",
      workerType: externalEmployee.worker_type || "Employee",
      profilePhoto: externalEmployee.user_profile || null,
      phoneNumber:
        externalEmployee.Mobile_number_1 ||
        externalEmployee.Mobile_number_2 ||
        null,
      dateOfBirth: externalEmployee.date_of_birth || null,
      gender: externalEmployee.gender_name || "Not Specified",
      reportingManager: externalEmployee.reporting_manager_id || null,
      leaveId: externalEmployee.leave_id || null,
      isDifferentlyAbled: externalEmployee.is_differently_abled === "Yes",
      lastWorkingDay: externalEmployee.last_working_day || null,
      // Backward compatibility fields
      user_id: externalEmployee.user_id || "N/A",
      user_name:
        externalEmployee.user_name ||
        `${externalEmployee.first_name || ""} ${externalEmployee.last_name || ""}`.trim() ||
        externalEmployee.employee_number ||
        `User ${externalEmployee.user_id}` ||
        "Employee",
      employee_number: externalEmployee.employee_number || "",
    };

    return transformed;
  } catch (error) {
    console.error(
      "[ExternalAPI] Error transforming employee data:",
      error,
      externalEmployee,
    );
    // Return a minimal valid employee object
    return {
      id: externalEmployee.user_id || "N/A",
      firstName: "Unknown",
      lastName: "Employee",
      email: "",
      employeeNumber: "",
      designation: "Employee",
      dateOfJoining: null,
      userRole: "General",
      workerType: "Employee",
      profilePhoto: null,
      phoneNumber: null,
      dateOfBirth: null,
      gender: "Not Specified",
      reportingManager: null,
      leaveId: null,
      isDifferentlyAbled: false,
      lastWorkingDay: null,
      user_id: externalEmployee.user_id || "N/A",
      user_name:
        externalEmployee.user_name ||
        `${externalEmployee.first_name || ""} ${externalEmployee.last_name || ""}`.trim() ||
        externalEmployee.employee_number ||
        `User ${externalEmployee.user_id}` ||
        "Employee",
      employee_number: externalEmployee.employee_number || "",
    };
  }
}

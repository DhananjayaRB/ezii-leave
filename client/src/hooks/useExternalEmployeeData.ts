import { useState, useEffect } from "react";

export interface ExternalEmployee {
  user_id: string;
  user_name: string;
  first_name?: string;
  last_name?: string;
  employee_number?: string;
  designation?: string;
  department?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  type_id_0?: string; // Location
  type_id_1?: string; // Department
  date_of_joining?: string;
}

export function useExternalEmployeeData() {
  const [employees, setEmployees] = useState<ExternalEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if JWT token exists before making API call
        const token = localStorage.getItem("jwt_token");
        if (!token) {
          console.log(
            "[ExternalEmployee] No JWT token available, skipping API call",
          );
          setLoading(false);
          return;
        }

        // Use the existing working external API function
        const { fetchEmployeeData, transformEmployeeData } = await import(
          "@/lib/externalApi"
        );

        console.log("[ExternalEmployee] Using existing working API...");
        const externalEmployees = await fetchEmployeeData();
        const transformedEmployees = externalEmployees.map((emp) => ({
          user_id: emp.user_id,
          user_name:
            emp.user_name ||
            `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
            emp.employee_number ||
            `Employee ${emp.user_id}`,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_number: emp.employee_number,
          designation: emp.designation_name,
          department: emp.band_name,
          email: emp.email,
          mobile: emp.Mobile_number_1,
          gender: emp.gender_name,
          date_of_joining: emp.date_of_joining, // Include joining date for pro-rata calculations
          type_id_0: emp.type_id_0, // Location field
          type_id_1: emp.type_id_1, // Department field
        }));

        console.log(
          "[ExternalEmployee] Successfully loaded",
          transformedEmployees.length,
          "employees",
        );
        setEmployees(transformedEmployees);
      } catch (error) {
        console.log(
          "[ExternalEmployee] External employee data fetch error:",
          error,
        );
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch employee data",
        );
      } finally {
        setLoading(false);
      }
    };

    // Add small delay to ensure JWT token is loaded
    const timeoutId = setTimeout(fetchEmployees, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  return { employees, loading, error };
}

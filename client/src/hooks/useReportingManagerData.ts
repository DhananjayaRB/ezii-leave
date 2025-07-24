import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Reportee {
  user_id: number;
  empnumber: string;
  empname: string;
  email: string;
}

interface ReportingManagerData {
  reportees: Reportee[];
  isReportingManager: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useReportingManagerData() {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<ReportingManagerData>({
    reportees: [],
    isReportingManager: false,
    isLoading: false,
    error: null,
  });
  
  console.log("[ReportingManager] Hook called - isAuthenticated:", isAuthenticated, "user:", !!user);

  const fetchReportees = async (userId: string) => {
    console.log("[ReportingManager] Fetching reportees for user_id:", userId);
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try multiple JWT token storage keys
      const jwtToken = localStorage.getItem('jwtToken') || localStorage.getItem('jwt_token') || localStorage.getItem('token');
      console.log("[ReportingManager] JWT token found:", !!jwtToken);
      console.log("[ReportingManager] JWT token length:", jwtToken?.length);
      
      if (!jwtToken) {
        console.log("[ReportingManager] No JWT token found in localStorage, showing all employees");
        console.log("[ReportingManager] Available localStorage keys:", Object.keys(localStorage));
        setData({
          reportees: [],
          isReportingManager: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      console.log("[ReportingManager] Making API call to:", `https://qa-api.resolveindia.com/organization/reporting-manager/${userId}/reportees`);
      console.log("[ReportingManager] Using JWT token:", jwtToken?.substring(0, 50) + "...");
      
      const response = await fetch(`https://qa-api.resolveindia.com/organization/reporting-manager/${userId}/reportees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("[ReportingManager] API Response status:", response.status);
      
      if (!response.ok) {
        console.log("[ReportingManager] API call failed with status:", response.status);
        const errorText = await response.text();
        console.log("[ReportingManager] Error response:", errorText);
        setData({
          reportees: [],
          isReportingManager: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const responseData = await response.json();
      console.log("[ReportingManager] API Response:", responseData);

      if (responseData.result === "Success" && Array.isArray(responseData.data)) {
        const reportees = responseData.data;
        const isReportingManager = reportees.length > 0;
        
        setData({
          reportees,
          isReportingManager,
          isLoading: false,
          error: null,
        });
        
        console.log(`[ReportingManager] User is ${isReportingManager ? 'a reporting manager' : 'not a reporting manager'} with ${reportees.length} reportees`);
      } else {
        setData({
          reportees: [],
          isReportingManager: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("[ReportingManager] Error fetching reportees:", error);
      setData({
        reportees: [],
        isReportingManager: false,
        isLoading: false,
        error: null, // Don't show error, just fall back to showing all employees
      });
    }
  };

  // Auto-fetch when user logs in
  useEffect(() => {
    console.log("[ReportingManager] Effect triggered - isAuthenticated:", isAuthenticated, "user:", !!user);
    if (isAuthenticated && user) {
      const userId = localStorage.getItem('user_id') || (user as any).id;
      console.log("[ReportingManager] User authenticated, calling reporting manager API for user_id:", userId);
      console.log("[ReportingManager] localStorage contents:", Object.keys(localStorage));
      console.log("[ReportingManager] Available tokens:", {
        jwtToken: !!localStorage.getItem('jwtToken'),
        jwt_token: !!localStorage.getItem('jwt_token'), 
        token: !!localStorage.getItem('token')
      });
      fetchReportees(userId);
    } else {
      console.log("[ReportingManager] Not calling API - isAuthenticated:", isAuthenticated, "user:", !!user);
    }
  }, [isAuthenticated, user]);

  // Force initial call for testing - run immediately
  useEffect(() => {
    const userId = localStorage.getItem('user_id') || '1';
    console.log("[ReportingManager] Force calling API immediately for testing with user_id:", userId);
    console.log("[ReportingManager] Current localStorage keys:", Object.keys(localStorage));
    fetchReportees(userId);
  }, []);

  // Also trigger on page load
  useEffect(() => {
    console.log("[ReportingManager] Hook mounted - forcing API call");
    const userId = localStorage.getItem('user_id') || '1';
    setTimeout(() => {
      console.log("[ReportingManager] Delayed API call with user_id:", userId);
      fetchReportees(userId);
    }, 1000);
  }, []);

  return data;
}
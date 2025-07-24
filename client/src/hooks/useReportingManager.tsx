import React, { useState, useEffect, useContext, createContext, ReactNode } from "react";
import { useAuth } from "./useAuth";

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

interface ReportingManagerContextType {
  reportingData: ReportingManagerData;
  fetchReportees: (userId: string) => Promise<void>;
  clearReportees: () => void;
}

const ReportingManagerContext = createContext<ReportingManagerContextType | null>(null);

export const ReportingManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [reportingData, setReportingData] = useState<ReportingManagerData>({
    reportees: [],
    isReportingManager: false,
    isLoading: false,
    error: null,
  });

  const fetchReportees = async (userId: string) => {
    console.log("[ReportingManager] Fetching reportees for user_id:", userId);
    setReportingData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get JWT token from localStorage
      const jwtToken = localStorage.getItem('jwtToken');
      if (!jwtToken) {
        console.log("[ReportingManager] No JWT token found");
        setReportingData(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: "No authentication token found",
          reportees: [],
          isReportingManager: false 
        }));
        return;
      }

      const response = await fetch(`https://qa-api.resolveindia.com/organization/reporting-manager/${userId}/reportees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("[ReportingManager] API Response:", data);

      if (data.result === "Success" && Array.isArray(data.data)) {
        const reportees = data.data;
        setReportingData({
          reportees,
          isReportingManager: reportees.length > 0,
          isLoading: false,
          error: null,
        });
        
        // Store in localStorage for persistence
        localStorage.setItem('reportingManager_data', JSON.stringify({
          reportees,
          isReportingManager: reportees.length > 0,
          lastFetch: Date.now()
        }));
        
        console.log(`[ReportingManager] User is ${reportees.length > 0 ? 'a reporting manager' : 'not a reporting manager'} with ${reportees.length} reportees`);
      } else {
        setReportingData({
          reportees: [],
          isReportingManager: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("[ReportingManager] Error fetching reportees:", error);
      setReportingData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch reportees",
      }));
    }
  };

  const clearReportees = () => {
    console.log("[ReportingManager] Clearing reportees data");
    setReportingData({
      reportees: [],
      isReportingManager: false,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem('reportingManager_data');
  };

  // Auto-fetch when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      const userId = localStorage.getItem('user_id') || user.id;
      console.log("[ReportingManager] User authenticated, auto-fetching reportees for user_id:", userId);
      
      // Check if we have recent cached data first
      const storedData = localStorage.getItem('reportingManager_data');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const timeDiff = Date.now() - (parsed.lastFetch || 0);
          // Use cached data if less than 5 minutes old
          if (timeDiff < 5 * 60 * 1000) {
            console.log("[ReportingManager] Using cached reportees data");
            setReportingData({
              reportees: parsed.reportees || [],
              isReportingManager: parsed.isReportingManager || false,
              isLoading: false,
              error: null,
            });
            return;
          }
        } catch (error) {
          console.error("[ReportingManager] Error parsing stored data:", error);
        }
      }
      
      // Fetch fresh data if no valid cache
      fetchReportees(userId);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <ReportingManagerContext.Provider value={{ reportingData, fetchReportees, clearReportees }}>
      {children}
    </ReportingManagerContext.Provider>
  );
};

export function useReportingManager() {
  const context = useContext(ReportingManagerContext);
  if (!context) {
    throw new Error("useReportingManager must be used within ReportingManagerProvider");
  }
  return context;
}
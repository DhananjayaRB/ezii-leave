import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { initializeUserId } from "@/lib/localStorage";
import { ReportingManagerProvider } from "@/hooks/useReportingManager";
import { useJWTTokenCheck } from "@/hooks/useJWTTokenCheck";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import ImportLeaveData from "@/pages/ImportLeaveData";
import LeaveApplications from "@/pages/LeaveApplications";
import Holidays from "@/pages/Holidays";
import CompensatoryOff from "@/pages/CompensatoryOff";
import BTO from "@/pages/PTO";
import TaskManager from "@/pages/TaskManager";
import AdminOverview from "@/pages/AdminOverview";
import Approvals from "@/pages/Approvals";
import Employees from "@/pages/Employees";
import AdminWorkflows from "@/pages/AdminWorkflows";
import AdminRoles from "@/pages/AdminRoles";
import AdminCompOff from "@/pages/AdminCompOff";
import AdminPTO from "@/pages/AdminPTO";
import AdminPTOVariants from "@/pages/AdminPTOVariants";
import AdminLeaveTypes from "@/pages/AdminLeaveTypes";
import LeaveTypeVariants from "@/pages/LeaveTypeVariants";
import AdminReports from "@/pages/AdminReports";
import EmployeeReports from "@/pages/EmployeeReports";
import HRLeaveBalanceReport from "@/pages/HRLeaveBalanceReport";
import AdminFeatureSettings from "@/pages/AdminFeatureSettings";
import AdminBlackoutPeriods from "@/pages/AdminBlackoutPeriods";
import LoaderDemo from "@/pages/LoaderDemo";
import TokenHandler from "@/pages/TokenHandler";
import TimeBasedApprovalTest from "@/pages/TimeBasedApprovalTest";
import NewEmployeeOverview from "@/components/Dashboard/NewEmployeeOverview";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";



function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check JWT token expiration
  useJWTTokenCheck();

  // Initialize user_id in localStorage on app startup
  useEffect(() => {
    initializeUserId();
    
    // Set default leave_year in localStorage if not already set
    if (!localStorage.getItem('leave_year')) {
      localStorage.setItem('leave_year', 'January-2025-December 2025');
      console.log('[App] Set default leave_year: January-2025-December 2025');
    }
    
    // Check for JWT token in URL and process it immediately
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/id/')) {
      const token = currentPath.substring(4); // Remove '/id/' prefix
      console.log('=== PROCESSING JWT TOKEN ===');
      console.log('Found token in URL:', token);
      
      try {
        // Decode JWT manually
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
          const decodedPayload = atob(paddedPayload);
          const parsedPayload = JSON.parse(decodedPayload);
          
          console.log('Decoded JWT payload:', parsedPayload);
          
          // Store JWT data in localStorage - preserve existing user_id if manually set
          const existingUserId = localStorage.getItem('user_id');
          const userIdToSet = existingUserId || parsedPayload.user_id;
          
          localStorage.setItem('org_id', parsedPayload.org_id);
          localStorage.setItem('user_id', userIdToSet);
          localStorage.setItem('role_id', parsedPayload.role_id);
          localStorage.setItem('role_name', parsedPayload.role_name);
          localStorage.setItem('user_type_id', parsedPayload.user_type_id);
          localStorage.setItem('jwt_token', token);
          
          console.log('JWT processing - preserved user_id:', userIdToSet, 'from JWT:', parsedPayload.user_id);
          
          console.log('JWT data stored, redirecting to home...');
          window.location.href = '/';
          return;
        }
      } catch (error) {
        console.error('Failed to process JWT token:', error);
      }
    }
    
    // JWT token processing is now working correctly
    
    // Debug localStorage contents  
    console.log('=== LOCALSTORAGE DEBUG ===');
    console.log('Keys in localStorage:', Object.keys(localStorage));
    console.log('org_id:', localStorage.getItem('org_id'));
    console.log('leave_year:', localStorage.getItem('leave_year'));
    console.log('user_id:', localStorage.getItem('user_id'));
    console.log('jwt_token:', localStorage.getItem('jwt_token') ? 'exists' : 'missing');
    console.log('role_name:', localStorage.getItem('role_name'));
    console.log('========================');
    console.log('======================');
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Switch>
        {/* Test route to verify routing works */}
        <Route path="/test">
          {() => <div>Test route works!</div>}
        </Route>
        
        {/* JWT Token Handler - Must be before authentication check */}
        <Route path="/id/:token" component={TokenHandler} />
        
        {/* Immediate JWT processing if URL contains /id/ */}
        {window.location.pathname.startsWith('/id/') ? null : null}
        
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/employee-overview" component={() => 
              <ProtectedRoute permission="employeeOverview">
                <Layout><NewEmployeeOverview /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/import-leave-data" component={ImportLeaveData} />
            <Route path="/leave-applications" component={LeaveApplications} />
            <Route path="/applications" component={LeaveApplications} />
            <Route path="/holidays" component={Holidays} />
            <Route path="/compensatory-off" component={CompensatoryOff} />
            <Route path="/pto" component={BTO} />
            <Route path="/task-manager" component={TaskManager} />
            <Route path="/overview" component={AdminOverview} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/employees" component={Employees} />
            <Route path="/workflows" component={AdminWorkflows} />
            <Route path="/roles" component={AdminRoles} />
            <Route path="/admin/leave-types" component={AdminLeaveTypes} />
            <Route path="/admin/comp-off" component={AdminCompOff} />
            <Route path="/admin/pto" component={AdminPTO} />
            <Route path="/admin/blackout-periods" component={() => 
              <ProtectedRoute permission="adminSettings">
                <AdminBlackoutPeriods />
              </ProtectedRoute>
            } />
            <Route path="/admin/feature-settings" component={() => 
              <ProtectedRoute permission="adminSettings">
                <Layout><AdminFeatureSettings /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/reports/:reportType?" component={AdminReports} />
            <Route path="/admin-reports/:reportType?" component={AdminReports} />
            <Route path="/hr-leave-balance-report" component={HRLeaveBalanceReport} />
            <Route path="/reports/:reportType?" component={EmployeeReports} />
            <Route path="/leave-types/:leaveTypeName" component={LeaveTypeVariants} />
            <Route path="/loader-demo" component={LoaderDemo} />
            <Route path="/time-based-approval-test" component={TimeBasedApprovalTest} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import SetupWizard from "@/components/Setup/SetupWizard";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/Dashboard/EmployeeDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";

export default function Home() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  // Check for role in localStorage on component mount
  useEffect(() => {
    // Check both 'role' and 'role_name' for backward compatibility
    const roleValue = localStorage.getItem("role");
    const roleNameValue = localStorage.getItem("role_name");

    console.log("[HOME] Role debugging:", {
      "localStorage.role": roleValue,
      "localStorage.role_name": roleNameValue,
    });

    // Prioritize role_name from JWT token over the old 'role' field
    const savedRole = roleNameValue || roleValue;
    const currentOrgId = localStorage.getItem("org_id");

    console.log("[HOME] Final role selected:", savedRole);

    // Multi-tenancy system ready - org_id changes will automatically trigger setup wizard

    if (savedRole) {
      setUserRole(savedRole);
    } else {
      setShowRoleSelection(true);
    }
  }, []);

  const handleRoleSelection = (role: "admin" | "employee" | "manager") => {
    localStorage.setItem("role", role);
    setUserRole(role);
    setShowRoleSelection(false);
  };

  const {
    data: company,
    isLoading: isLoadingCompany,
    error,
  } = useQuery({
    queryKey: ["/api/company"],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });

  // Check if org_id has changed from what the company data was retrieved for
  const currentOrgIdForCheck = localStorage.getItem("org_id");
  console.log(
    `[DEBUG] Current org_id from localStorage: ${currentOrgIdForCheck}`,
  );

  // The company data should include the org_id it was retrieved for
  const companyOrgId = company ? (company as any).orgId : null;
  console.log(`[DEBUG] Company orgId from API: ${companyOrgId}`);

  // Show role selection screen if no role is set
  if (showRoleSelection) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Choose Your Role
            </CardTitle>
            <p className="text-gray-600">Select your role to continue</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleSelection("admin")}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Admin
            </Button>
            <Button
              onClick={() => handleRoleSelection("employee")}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              Employee
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingCompany) {
    return (
      <Layout>
        <div className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  // Check if setup is completed - only for admin users
  // Also check if org_id has changed (new organization needs setup)
  const isSetupCompleted =
    company && (company as any)?.setupStatus === "completed";
  const isOrgIdMismatch =
    currentOrgIdForCheck &&
    companyOrgId &&
    currentOrgIdForCheck !== companyOrgId.toString();
  const isNewOrganization = !company; // No company data means new organization
  const needsSetup = !isSetupCompleted || isOrgIdMismatch || isNewOrganization;

  console.log(`[DEBUG] Setup wizard check:`, {
    currentOrgId: currentOrgIdForCheck,
    companyOrgId,
    isSetupCompleted,
    isOrgIdMismatch,
    isNewOrganization,
    needsSetup,
    userRole,
    currentPath: window.location.pathname,
  });

  // Admin and manager users need to complete setup first or if org_id changed
  if ((userRole === "admin" || userRole === "manager") && needsSetup) {
    console.log("[HOME] Setup wizard condition met - rendering SetupWizard");
    console.log("[HOME] userRole:", userRole, "needsSetup:", needsSetup);
    // If org_id changed or new organization, clear any cached setup data and force reload
    if (isOrgIdMismatch || isNewOrganization) {
      if (!sessionStorage.getItem("setup_redirect_done")) {
        sessionStorage.setItem("setup_redirect_done", "true");
        localStorage.removeItem("setupWizardStep");
        localStorage.removeItem("user_permissions");
        // Clear role-specific permissions for the old org
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("role_permissions_")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        queryClient.clear();
        window.location.reload();
        return null;
      }
    }
    return <SetupWizard company={company} />;
  }

  console.log("[HOME] Setup wizard condition NOT met - rendering dashboard");
  console.log(
    "[HOME] Condition check: userRole=",
    userRole,
    "needsSetup=",
    needsSetup,
  );

  // Show appropriate dashboard based on role
  return (
    <Layout>
      {userRole === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </Layout>
  );
}

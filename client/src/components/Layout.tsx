import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeData } from "@/lib/externalApi";
import {
  Home,
  BarChart3,
  CheckCircle,
  Users,
  GitBranch,
  UserCheck,
  Settings,
  Bell,
  FileText,
  ChevronDown,
  Upload,
  ToggleLeft,
  ToggleRight,
  ListTodo,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const {
    canViewScreen,
    loading: permissionsLoading,
    permissions,
  } = usePermissions();
  const [location] = useLocation();
  const [configurationsExpanded, setConfigurationsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);

  // Fetch external employee data
  const { data: externalEmployees = [] } = useQuery({
    queryKey: ["external-employees"],
    queryFn: fetchEmployeeData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current user's display data - check localStorage override first
  const localStorageUserId = localStorage.getItem("user_id");
  const userData = user as any;

  // If localStorage has a different user_id, try to find that user in external employees
  let displayName = "User";
  let initials = "U";

  if (localStorageUserId && localStorageUserId !== userData?.id) {
    // Use external employee data for localStorage user_id, with fallback mapping
    const targetEmployee = (externalEmployees as any[]).find(
      (emp) => emp.user_id === localStorageUserId,
    );
    if (targetEmployee?.user_name) {
      displayName = targetEmployee.user_name;
      initials = targetEmployee.user_name
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    } else {
      // Fallback mapping for known test users when external API isn't available
      const knownUsers: Record<string, { name: string; initials: string }> = {
        "6005": { name: "George Mathews", initials: "GM" },
        "7243": { name: "Sumalatha Thadimari", initials: "ST" },
        "7246": { name: "Anjali Kumari", initials: "AK" },
        "12080": { name: "Rahul Sharma", initials: "RS" },
      };

      const knownUser = knownUsers[localStorageUserId];
      if (knownUser) {
        displayName = knownUser.name;
        initials = knownUser.initials;
      } else {
        // Show loading state for unknown users while external API loads
        // Special case: show "admin" instead of "Employee 1435"
        if (localStorageUserId === "1435") {
          displayName = "admin";
          initials = "AD";
        } else {
          displayName = `Employee ${localStorageUserId}`;
          initials = localStorageUserId.substring(0, 2).toUpperCase();
        }
      }
    }
  } else {
    // Use authenticated user data
    displayName =
      userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.email
          ? userData.email.split("@")[0]
          : "User";

    initials =
      userData?.firstName && userData?.lastName
        ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
        : userData?.firstName
          ? userData.firstName[0].toUpperCase()
          : "U";
  }

  // Get user role from localStorage (permanent role)
  const userRole =
    localStorage.getItem("role_name") || localStorage.getItem("role");

  // Get current view mode (separate from actual role)
  const [currentView, setCurrentView] = useState(() => {
    const savedView = localStorage.getItem("currentView");
    return savedView || "admin";
  });

  // Sync currentView with localStorage on mount and when it changes
  useEffect(() => {
    const savedView = localStorage.getItem("currentView");
    if (savedView && savedView !== currentView) {
      setCurrentView(savedView);
    }
  }, []);

  const toggleView = () => {
    const newView = currentView === "admin" ? "employee" : "admin";
    setCurrentView(newView);
    localStorage.setItem("currentView", newView);
  };

  // Navigation items with their permission mappings
  const allNavigationItems = [
    // Admin Navigation
    {
      name: "Admin Overview",
      href: "/overview",
      icon: BarChart3,
      permission: "adminOverview",
      type: "admin",
    },
    {
      name: "Approvals",
      href: "/approvals",
      icon: CheckCircle,
      permission: "approvals",
      type: "admin",
    },
    {
      name: "Employees",
      href: "/employees",
      icon: Users,
      permission: "employees",
      type: "admin",
    },
    {
      name: "Workflows",
      href: "/workflows",
      icon: GitBranch,
      permission: "workflows",
      type: "admin",
    },
    {
      name: "Roles",
      href: "/roles",
      icon: UserCheck,
      permission: "roles",
      type: "admin",
    },

    {
      name: "Import Leave Data",
      href: "/import-leave-data",
      icon: Upload,
      permission: "importLeaveData",
      type: "admin",
    },

    // Employee Navigation
    {
      name: "My Dashboard",
      href: "/employee-overview",
      icon: Home,
      permission: "employeeOverview",
      type: "employee",
    },
    {
      name: "Leave Applications",
      href: "/applications",
      icon: Home,
      permission: "leaveApplications",
      type: "employee",
    },
    {
      name: "Holidays",
      href: "/holidays",
      icon: Home,
      permission: "holidays",
      type: "employee",
    },
    {
      name: "Compensatory Off",
      href: "/compensatory-off",
      icon: Home,
      permission: "compensatoryOff",
      type: "employee",
    },
    {
      name: "PTO",
      href: "/pto",
      icon: Home,
      permission: "pto",
      type: "employee",
    },
    {
      name: "Task Manager",
      href: "/task-manager",
      icon: ListTodo,
      permission: "employeeOverview",
      type: "employee",
    },
  ];

  const allConfigurationItems = [
    {
      name: "Leave Types",
      href: "/admin/leave-types",
      icon: Settings,
      permission: "adminLeaveTypes",
    },
    {
      name: "Comp Off",
      href: "/admin/comp-off",
      icon: Settings,
      permission: "adminCompOff",
    },
    { name: "PTO", href: "/admin/pto", icon: Settings, permission: "adminPTO" },
    {
      name: "Black Out Period",
      href: "/admin/blackout-periods",
      icon: Settings,
      permission: "adminSettings",
    },
    {
      name: "Features",
      href: "/admin/feature-settings",
      icon: Settings,
      permission: "adminSettings",
    },
  ];

  const allAdminReportItems = [
    {
      name: "Leave Availed Report",
      href: "/admin/reports/leave-availed",
      icon: FileText,
      permission: "adminReports",
    },
    {
      name: "Withdrawal Rejection Report",
      href: "/admin/reports/withdrawal-rejection",
      icon: FileText,
      permission: "adminReports",
    },
    {
      name: "Collaborative Leave Report",
      href: "/admin/reports/collaborative-leave",
      icon: FileText,
      permission: "adminReports",
    },
    {
      name: "HR Leave Balance Report",
      href: "/hr-leave-balance-report",
      icon: FileText,
      permission: "adminReports",
    },
  ];

  const allEmployeeReportItems = [
    {
      name: "My Leave History",
      href: "/reports/history",
      icon: FileText,
      permission: "employeeReports",
    },
    {
      name: "My Balances",
      href: "/reports/balances",
      icon: FileText,
      permission: "employeeReports",
    },
    {
      name: "My Withdrawal History",
      href: "/reports/withdrawal-history",
      icon: FileText,
      permission: "employeeReports",
    },
  ];

  // Check if current user can toggle roles based on having permissions in both admin and employee views
  const storedUserId = localStorage.getItem("user_id");

  const hasAdminPermissions =
    !permissionsLoading &&
    permissions &&
    allNavigationItems
      .filter((item) => item.type === "admin")
      .some((item) => canViewScreen(item.permission as any));

  const hasEmployeePermissions =
    !permissionsLoading &&
    permissions &&
    allNavigationItems
      .filter((item) => item.type === "employee")
      .some((item) => canViewScreen(item.permission as any));

  // Always show toggle for admin role users (they can view both admin and employee sections)
  const canToggleRole =
    userRole === "admin" || (hasAdminPermissions && hasEmployeePermissions);

  // Filter navigation items based on permissions and current view - recalculated on every render
  const navigation =
    permissionsLoading || !permissions
      ? []
      : allNavigationItems.filter((item) => {
          const hasPermission = canViewScreen(item.permission as any);
          return item.type === currentView && hasPermission;
        });

  const configurations =
    permissionsLoading || !permissions
      ? []
      : allConfigurationItems.filter((item) => {
          const hasPermission = canViewScreen(item.permission as any);

          return currentView === "admin" && hasPermission;
        });

  const adminReports =
    permissionsLoading || !permissions
      ? []
      : allAdminReportItems.filter((item) => {
          return (
            currentView === "admin" && canViewScreen(item.permission as any)
          );
        });

  const employeeReports =
    permissionsLoading || !permissions
      ? []
      : allEmployeeReportItems.filter((item) => {
          return (
            currentView === "employee" && canViewScreen(item.permission as any)
          );
        });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-white flex-shrink-0 relative flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-600">
          <div className="flex items-center">
            <img
              src="/eziileave-logo.png"
              alt="EziiLeave"
              className="h-8 w-auto"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 overflow-y-auto flex-1 pb-20">
          <div className="px-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Home className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Home</span>
              </div>
              <div className="ml-7 mt-2 text-sm text-gray-300">Leave</div>
            </div>
          </div>

          <div className="space-y-1 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-gray-700 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}

            {userRole === "admin" && configurations.length > 0 && (
              <div className="space-y-1">
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() =>
                    setConfigurationsExpanded(!configurationsExpanded)
                  }
                >
                  <Settings className="w-5 h-5" />
                  <span>Configurations</span>
                  <ChevronDown
                    className={`w-4 h-4 ml-auto transition-transform ${configurationsExpanded ? "rotate-180" : ""}`}
                  />
                </div>
                {configurationsExpanded && (
                  <div className="ml-8 space-y-1">
                    {configurations.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href}>
                          <a
                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? "bg-gray-700 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            <span className="text-sm">{item.name}</span>
                          </a>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Admin Reports Section */}
            {currentView === "admin" && adminReports.length > 0 && (
              <div className="space-y-1">
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                  <ChevronDown
                    className={`w-4 h-4 ml-auto transition-transform ${reportsExpanded ? "rotate-180" : ""}`}
                  />
                </div>
                {reportsExpanded && (
                  <div className="ml-8 space-y-1">
                    {adminReports.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href}>
                          <div
                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? "bg-gray-700 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            <span className="text-sm">{item.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Employee Reports Section */}
            {currentView === "employee" && employeeReports.length > 0 && (
              <div className="space-y-1">
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                  <ChevronDown
                    className={`w-4 h-4 ml-auto transition-transform ${reportsExpanded ? "rotate-180" : ""}`}
                  />
                </div>
                {reportsExpanded && (
                  <div className="ml-8 space-y-1">
                    {employeeReports.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href}>
                          <div
                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? "bg-gray-700 text-white"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            <span className="text-sm">{item.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* View Toggle at Bottom */}
        {userRole === "admin" && (
          <div className="mt-auto p-4">
            <div className="flex items-center justify-between p-3 bg-gray-600 rounded-md">
              <span className="text-sm text-white font-medium">
                {currentView === "admin" ? "Admin View" : "Employee View"}
              </span>
              <button
                onClick={toggleView}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentView === "admin" ? "bg-blue-500" : "bg-gray-400"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentView === "admin" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-medium text-gray-800">
                {location === "/"
                  ? "Leave Management"
                  : location === "/setup"
                    ? "Leave Management / Setup"
                    : navigation.find((item) => item.href === location)?.name ||
                      "Leave Management"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
              </button>

              {/* View Indicator and Switch */}
              {userRole === "admin" && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">View:</span>
                  <button
                    onClick={toggleView}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {currentView === "admin" ? "Admin" : "Employee"}
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2 cursor-pointer">
                <span className="text-sm text-gray-700">{displayName}</span>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {initials}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}

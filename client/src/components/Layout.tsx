import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useJWTTokenCheck } from "@/hooks/useJWTTokenCheck";
import { useClientProducts } from "@/hooks/useClientProducts";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { redirectToModule, redirectToLoginModule } from "@/utils/moduleRedirects";
import { redirectToLogin } from "@/utils/authRedirects";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeData } from "@/lib/externalApi";
import { fetchUserProfile, type UserProfileResponse } from "@/lib/userProfileApi";
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
  Calculator,
  Calendar,
  Clock,
  LogOut,
  User,
  CalendarDays,
  Coffee,
  FileCheck,
  Plus,
  Building2,
  Receipt,
  Menu,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";


interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { canViewScreen, loading: permissionsLoading, permissions } = usePermissions();
  const { clientProducts, isLoading: clientProductsLoading } = useClientProducts();
  const { data: planStatus, isLoading: planStatusLoading } = usePlanStatus();
  const [location] = useLocation();
  const [configurationsExpanded, setConfigurationsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(() => {
    // Set default active module based on what's enabled (prefer leaves if available)
    return 'leaves';
  });

  // Logout function
  const handleLogout = async () => {
    // Clear all authentication data
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('role');
    localStorage.removeItem('role_name');
    localStorage.removeItem('org_id');
    localStorage.removeItem('leave_year');
    
    // Redirect to the appropriate login service based on plan status
    await redirectToLogin();
  };

  // Module click handler - handles both external redirects and internal module switching
  const handleModuleClick = async (moduleId: string) => {
    // External modules that require plan status check and redirect
    const planStatusModules = ['core', 'payroll'];
    const loginStringModules = ['attendance', 'expense'];
    
    if (planStatusModules.includes(moduleId)) {
      // Check if plan status is available
      if (planStatus && !planStatusLoading) {
        console.log(`[Module Click] ${moduleId} clicked, isSaas: ${planStatus.isSaas}`);
        redirectToModule(moduleId, planStatus.isSaas);
      } else {
        console.log(`[Module Click] ${moduleId} clicked, but plan status not loaded yet`);
        // Optionally show a loading state or retry
      }
    } else if (loginStringModules.includes(moduleId)) {
      // Modules that require login string API call
      await redirectToLoginModule(moduleId);
    } else {
      // Internal modules - use normal module switching
      setActiveModule(moduleId);
    }
  };
  
  // Check JWT token expiration
  useJWTTokenCheck();

  // Fetch external employee data
  const { data: externalEmployees = [] } = useQuery({
    queryKey: ["external-employees"],
    queryFn: fetchEmployeeData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user profile data for organization logo
  const { data: userProfile } = useQuery<UserProfileResponse | null>({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Get current user's display data - check localStorage override first
  const localStorageUserId = localStorage.getItem('user_id');
  const userData = user as any;
  
  // If localStorage has a different user_id, try to find that user in external employees
  let displayName = 'User';
  let initials = 'U';
  
  if (localStorageUserId && localStorageUserId !== userData?.id) {
    // Use external employee data for localStorage user_id, with fallback mapping
    const targetEmployee = (externalEmployees as any[]).find(emp => emp.user_id === localStorageUserId);
    if (targetEmployee?.user_name) {
      displayName = targetEmployee.user_name;
      initials = targetEmployee.user_name.split(' ').map((name: string) => name[0]).join('').substring(0, 2).toUpperCase();
    } else {
      // Fallback mapping for known test users when external API isn't available
      const knownUsers: Record<string, {name: string, initials: string}> = {
        '6005': { name: 'George Mathews', initials: 'GM' },
        '7243': { name: 'Sumalatha Thadimari', initials: 'ST' },
        '7246': { name: 'Anjali Kumari', initials: 'AK' },
        '12080': { name: 'Rahul Sharma', initials: 'RS' }
      };
      
      const knownUser = knownUsers[localStorageUserId];
      if (knownUser) {
        displayName = knownUser.name;
        initials = knownUser.initials;
      } else {
        // Show loading state for unknown users while external API loads
        // Special case: show "admin" instead of "Employee 1435"
        if (localStorageUserId === '1435') {
          displayName = 'admin';
          initials = 'AD';
        } else {
          displayName = `Employee ${localStorageUserId}`;
          initials = localStorageUserId.substring(0, 2).toUpperCase();
        }
      }
    }
  } else {
    // Use authenticated user data
    displayName = userData?.firstName && userData?.lastName ? 
      `${userData.firstName} ${userData.lastName}` : 
      (userData?.email ? userData.email.split('@')[0] : 'User');
    
    initials = userData?.firstName && userData?.lastName ? 
      `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase() : 
      (userData?.firstName ? userData.firstName[0].toUpperCase() : 'U');
  }

  // Get user role from localStorage (permanent role)
  const userRole = localStorage.getItem('role_name') || localStorage.getItem('role');
  

  
  // Get current view mode (separate from actual role)
  const [currentView, setCurrentView] = useState(() => {
    const savedView = localStorage.getItem('currentView');
    return savedView || 'admin';
  });
  
  // Sync currentView with localStorage on mount only
  useEffect(() => {
    const savedView = localStorage.getItem('currentView');
    if (savedView && savedView !== currentView) {
      setCurrentView(savedView);
    }
  }, []);

  const toggleView = () => {
    const newView = currentView === 'admin' ? 'employee' : 'admin';
    setCurrentView(newView);
    localStorage.setItem('currentView', newView);
  };

  // Navigation items with their permission mappings
  const allNavigationItems = [
    // Admin Navigation
    { name: "Admin Overview", href: "/overview", icon: BarChart3, permission: "adminOverview", type: "admin" },
    { name: "Approvals", href: "/approvals", icon: CheckCircle, permission: "approvals", type: "admin" },
    { name: "Employees", href: "/employees", icon: Users, permission: "employees", type: "admin" },
    { name: "Workflows", href: "/workflows", icon: GitBranch, permission: "workflows", type: "admin" },
    { name: "Roles", href: "/roles", icon: UserCheck, permission: "roles", type: "admin" },

    { name: "Import Leave Data", href: "/import-leave-data", icon: Upload, permission: "importLeaveData", type: "admin" },
    
    // Employee Navigation
    { name: "My Dashboard", href: "/employee-overview", icon: BarChart3, permission: "employeeOverview", type: "employee" },
    { name: "Leave Applications", href: "/applications", icon: FileCheck, permission: "leaveApplications", type: "employee" },
    { name: "Holidays", href: "/holidays", icon: CalendarDays, permission: "holidays", type: "employee" },
    { name: "Compensatory Off", href: "/compensatory-off", icon: Coffee, permission: "compensatoryOff", type: "employee" },
    { name: "BTO", href: "/pto", icon: Clock, permission: "bto", type: "employee" },
    { name: "Task Manager", href: "/task-manager", icon: ListTodo, permission: "employeeOverview", type: "employee" },

  ];

  const allConfigurationItems = [
    { name: "Leave Types", href: "/admin/leave-types", icon: Settings, permission: "adminLeaveTypes" },
    { name: "Comp Off", href: "/admin/comp-off", icon: Settings, permission: "adminCompOff" },
    { name: "BTO", href: "/admin/pto", icon: Settings, permission: "adminBTO" },
    { name: "Black Out Period", href: "/admin/blackout-periods", icon: Settings, permission: "adminSettings" },
    { name: "Features", href: "/admin/feature-settings", icon: Settings, permission: "adminSettings" },
  ];

  const allAdminReportItems = [
    { name: "Leave Availed Report", href: "/admin/reports/leave-availed", icon: FileText, permission: "adminReports" },
    { name: "Withdrawal Rejection Report", href: "/admin/reports/withdrawal-rejection", icon: FileText, permission: "adminReports" },
    { name: "Collaborative Leave Report", href: "/admin/reports/collaborative-leave", icon: FileText, permission: "adminReports" },
    { name: "BTO Report", href: "/admin/reports/bto-report", icon: FileText, permission: "adminReports" },
    { name: "Comp-off Report", href: "/admin/reports/comp-off-report", icon: FileText, permission: "adminReports" },
    { name: "HR Leave Balance Report", href: "/hr-leave-balance-report", icon: FileText, permission: "adminReports" },
  ];

  const allEmployeeReportItems = [
    { name: "My Leave History", href: "/reports/history", icon: FileText, permission: "employeeReports" },
    { name: "My Balances", href: "/reports/balances", icon: FileText, permission: "employeeReports" },
    { name: "My Withdrawal History", href: "/reports/withdrawal-history", icon: FileText, permission: "employeeReports" },
  ];

  // Check if current user can toggle roles based on having permissions in both admin and employee views
  const storedUserId = localStorage.getItem('user_id');
  
  const hasAdminPermissions = !permissionsLoading && permissions && allNavigationItems
    .filter(item => item.type === 'admin')
    .some(item => canViewScreen(item.permission as any));
  
  const hasEmployeePermissions = !permissionsLoading && permissions && allNavigationItems
    .filter(item => item.type === 'employee')
    .some(item => canViewScreen(item.permission as any));
  
  // Always show toggle for admin role users (they can view both admin and employee sections)
  const canToggleRole = userRole === 'admin' || (hasAdminPermissions && hasEmployeePermissions);

  // Filter navigation items based on permissions and current view - recalculated on every render
  const navigation = permissionsLoading || !permissions ? [] : allNavigationItems.filter(item => {
    const hasPermission = canViewScreen(item.permission as any);
    return item.type === currentView && hasPermission;
  });

  const configurations = permissionsLoading || !permissions ? [] : allConfigurationItems.filter(item => {
    const hasPermission = canViewScreen(item.permission as any);

    return currentView === 'admin' && hasPermission;
  });

  const adminReports = permissionsLoading || !permissions ? [] : allAdminReportItems.filter(item => {
    return currentView === 'admin' && canViewScreen(item.permission as any);
  });

  const employeeReports = permissionsLoading || !permissions ? [] : allEmployeeReportItems.filter(item => {
    return currentView === 'employee' && canViewScreen(item.permission as any);
  });

  // Dynamic module navigation items based on client products
  const modules = clientProducts ? [
    ...(clientProducts.isCore ? [{
      id: 'core',
      name: 'Core Master',
      icon: Building2,
      active: activeModule === 'core'
    }] : []),
    ...(clientProducts.isPayroll ? [{
      id: 'payroll',
      name: 'Payroll',
      icon: Calculator,
      active: activeModule === 'payroll'
    }] : []),
    ...(clientProducts.isAttendance ? [{
      id: 'attendance',
      name: 'Attendance',
      icon: Clock,
      active: activeModule === 'attendance'
    }] : []),
    ...(clientProducts.isLeave ? [{
      id: 'leaves',
      name: 'Leaves',
      icon: Calendar,
      active: activeModule === 'leaves'
    }] : []),
    ...(clientProducts.isExpense ? [{
      id: 'expense',
      name: 'Expense',
      icon: Receipt,
      active: activeModule === 'expense'
    }] : [])
  ] : [
    // Default modules while loading or if API fails
    {
      id: 'leaves',
      name: 'Leaves',
      icon: Calendar,
      active: activeModule === 'leaves'
    }
  ];

  // Update active module when client products are loaded
  useEffect(() => {
    if (clientProducts && !clientProductsLoading) {
      // Set the first available module as active if current active module is not available
      const availableModules = modules.map(m => m.id);
      if (!availableModules.includes(activeModule)) {
        const firstAvailable = availableModules[0];
        if (firstAvailable) {
          setActiveModule(firstAvailable);
        }
      }
    }
  }, [clientProducts, clientProductsLoading]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-16 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <img 
            src="/eziileave-logo.png" 
            alt="eziileave" 
            className="h-8 w-auto"
          />
        </div>
        <div className="w-10" /> {/* Spacer for balance */}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Narrow Module Sidebar - Desktop */}
      <div className="hidden md:flex w-20 bg-gray-800 flex-col items-center py-6 space-y-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => handleModuleClick(module.id)}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                module.active 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium text-center leading-tight">{module.name}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Bottom Module Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 z-30 flex justify-around items-center py-2 border-t border-gray-700">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => handleModuleClick(module.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                module.active 
                  ? 'text-white' 
                  : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium text-center truncate">{module.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:relative w-80 md:w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 z-40 flex flex-col h-full transition-transform duration-300 ease-in-out`}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex justify-between items-center p-4 border-b border-sidebar-border">
          <span className="text-lg font-semibold">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organization Logo Section */}
        <div className="p-4 md:p-6 border-b border-sidebar-border">
          <div className="flex justify-center">
            {userProfile?.data?.organization_logo ? (
              <div className="flex flex-col items-center">
                <img 
                  src={userProfile.data.organization_logo} 
                  alt={userProfile.data.organization_name || 'Organization'} 
                  className="h-10 md:h-12 w-auto max-w-[120px] object-contain rounded-lg border border-sidebar-border bg-white p-2"
                  onError={(e) => {
                    console.log('[Layout] Failed to load organization logo');
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-sm md:text-sm text-sidebar-foreground/90 mt-2 text-center font-medium">
                  {userProfile.data.organization_name}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-10 md:h-12 w-20 md:w-24 bg-sidebar-accent rounded-lg border border-sidebar-border flex items-center justify-center">
                  <span className="text-sidebar-foreground/70 text-xs">No Logo</span>
                </div>
                <span className="text-sm text-sidebar-foreground/90 mt-2 text-center font-medium">
                  Organization
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-4 md:mt-6 overflow-y-auto flex-1 pb-4 md:pb-20">
          <div className="px-3 md:px-4 mb-4 md:mb-6">
            <div className="bg-sidebar-accent rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Home className="w-4 md:w-5 h-4 md:h-5 text-sidebar-foreground" />
                <span className="text-sidebar-foreground font-medium text-sm md:text-base">Home</span>
              </div>
              <div className="ml-6 md:ml-7 mt-2 text-xs md:text-sm text-sidebar-foreground/70">Leave</div>
            </div>
          </div>

          <div className="space-y-1 px-3 md:px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a 
                    className={`flex items-center space-x-3 p-3 md:p-3 rounded-lg transition-colors touch-manipulation ${
                      isActive 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                    onClick={() => setSidebarOpen(false)} // Close mobile sidebar on navigation
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm md:text-base">{item.name}</span>
                  </a>
                </Link>
              );
            })}
            

            
            {userRole === 'admin' && configurations.length > 0 && (
              <div className="space-y-1">
                <div 
                  className="flex items-center space-x-3 p-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent cursor-pointer transition-colors touch-manipulation"
                  onClick={() => setConfigurationsExpanded(!configurationsExpanded)}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm md:text-base">Configurations</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${configurationsExpanded ? 'rotate-180' : ''}`} />
                </div>
              {configurationsExpanded && (
                <div className="ml-6 md:ml-8 space-y-1">
                  {configurations.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.name} href={item.href}>
                        <a 
                          className={`flex items-center space-x-3 p-2 md:p-2 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}
                          onClick={() => setSidebarOpen(false)}
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
            {currentView === 'admin' && adminReports.length > 0 && (
              <div className="space-y-1">
                <div 
                  className="flex items-center space-x-3 p-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent cursor-pointer transition-colors"
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${reportsExpanded ? 'rotate-180' : ''}`} />
                </div>
                {reportsExpanded && (
                  <div className="ml-8 space-y-1">
                    {adminReports.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href}>
                          <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}>
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
            {currentView === 'employee' && employeeReports.length > 0 && (
              <div className="space-y-1">
                <div 
                  className="flex items-center space-x-3 p-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent cursor-pointer transition-colors"
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${reportsExpanded ? 'rotate-180' : ''}`} />
                </div>
                {reportsExpanded && (
                  <div className="ml-8 space-y-1">
                    {employeeReports.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.name} href={item.href}>
                          <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}>
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
        {userRole === 'admin' && (
          <div className="mt-auto p-3 md:p-4">
            <div className="flex items-center justify-between p-3 bg-sidebar-accent rounded-md">
              <span className="text-xs md:text-sm text-sidebar-accent-foreground font-medium">
                {currentView === 'admin' ? 'Admin View' : 'Employee View'}
              </span>
              <button
                onClick={toggleView}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                  currentView === 'admin' ? 'bg-blue-500' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentView === 'admin' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 pb-16 md:pb-0">
        {/* Top Bar - Hidden on mobile, shown on desktop */}
        <header className="hidden md:flex bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
              {/* EziiLeave Logo in Header */}
              <img 
                src="/eziileave-logo.png" 
                alt="EziiLeave" 
                className="h-8 md:h-12 w-auto flex-shrink-0"
              />
              <div className="h-4 md:h-6 w-px bg-gray-300 flex-shrink-0"></div>
              <h1 className="text-base md:text-lg font-medium text-gray-800 truncate">
                {location === "/" ? "Leave Management" : 
                 location === "/setup" ? "Leave Management / Setup" :
                 navigation.find(item => item.href === location)?.name || "Leave Management"}
              </h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              <button className="hidden md:block p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-4 md:w-5 h-4 md:h-5" />
              </button>
              
              {/* View Indicator and Switch - Hidden on mobile */}
              {userRole === 'admin' && (
                <div className="hidden md:flex items-center space-x-2">
                  <span className="text-xs text-gray-500">View:</span>
                  <button
                    onClick={toggleView}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                  >
                    {currentView === 'admin' ? 'Admin' : 'Employee'}
                  </button>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center space-x-1 md:space-x-2 cursor-pointer hover:bg-gray-50 p-1 md:p-2 rounded-lg transition-colors">
                    <span className="hidden md:block text-sm text-gray-700 truncate max-w-[120px]">
                      {displayName}
                    </span>
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs md:text-sm font-medium">
                        {initials}
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-2 md:px-0">
          {children}
        </main>
      </div>
    </div>
  );
}

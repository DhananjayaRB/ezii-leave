import { usePermissions } from "@/hooks/usePermissions";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission: string;
  fallback?: string;
}

export default function ProtectedRoute({ 
  children, 
  permission, 
  fallback = "/" 
}: ProtectedRouteProps) {
  const { canViewScreen, loading } = usePermissions();

  // Show loading while permissions are being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check permission
  const hasPermission = canViewScreen(permission as any);
  
  if (!hasPermission) {
    return <Redirect to={fallback} />;
  }

  return <>{children}</>;
}
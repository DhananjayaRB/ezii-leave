import { useQuery } from "@tanstack/react-query";
import { redirectToLogin } from "@/utils/authRedirects";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Check JWT token and redirect if missing (but not on token setup routes)
  useEffect(() => {
    const jwtToken = localStorage.getItem('jwt_token');
    const isTokenSetupRoute = window.location.pathname.startsWith('/id/');

    if (!jwtToken || jwtToken.trim() === '' || jwtToken === 'null' || jwtToken === 'undefined') {
      if (!isTokenSetupRoute && !isLoading) {
        console.log('[useAuth] JWT token missing, redirecting to authentication service...');
        redirectToLogin();
        return;
      }
    }
  }, [isLoading]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

import { useEffect } from 'react';
import { redirectToLogin } from '@/utils/authRedirects';

interface JWTPayload {
  exp: number;
  [key: string]: any;
}

const parseJWT = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT token:', error);
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return true; // Consider invalid tokens as expired
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 1 minute buffer before actual expiration

  return payload.exp - bufferTime <= currentTime;
};

export const useJWTTokenCheck = () => {
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('jwt_token');

      // Check if we're currently on the token setup route
      const isTokenSetupRoute = window.location.pathname.startsWith('/id/');

      console.log('[JWT Check] Checking token expiration...');
      console.log('[JWT Check] Token exists:', !!token);
      console.log('[JWT Check] On token setup route:', isTokenSetupRoute);

      if (!token) {
        if (isTokenSetupRoute) {
          console.log('[JWT Check] On token setup route, skipping redirect');
          return;
        }
        console.log('[JWT Check] No JWT token found in localStorage');
        return;
      }

      try {
        const expired = isTokenExpired(token);
        console.log('[JWT Check] Token expired:', expired);

        if (expired) {
          if (isTokenSetupRoute) {
            console.log('[JWT Check] Token expired but on token setup route, skipping redirect');
            return;
          }

          console.log('[JWT Check] Token expired, redirecting to authentication service');

          // Clear all localStorage data related to authentication
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('role');
          localStorage.removeItem('org_id');
          localStorage.removeItem('leave_year');

          // Redirect to authentication service based on plan status
          redirectToLogin();
        }
      } catch (error) {
        if (isTokenSetupRoute) {
          console.log('[JWT Check] Error parsing token but on token setup route, skipping redirect');
          return;
        }

        console.error('[JWT Check] Error checking token expiration:', error);
        // On error parsing token, treat as expired
        console.log('[JWT Check] Invalid token format, redirecting to authentication service');
        localStorage.removeItem('jwt_token');
        redirectToLogin();
      }
    };

    // Check immediately on mount
    checkTokenExpiration();

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    // Also check on focus (when user returns to tab)
    const handleFocus = () => {
      console.log('[JWT Check] Tab focused, checking token expiration');
      checkTokenExpiration();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
};
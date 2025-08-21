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
<<<<<<< HEAD

  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 1 minute buffer before actual expiration

=======
  
  const currentTime = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 1 minute buffer before actual expiration
  
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  return payload.exp - bufferTime <= currentTime;
};

export const useJWTTokenCheck = () => {
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('jwt_token');
<<<<<<< HEAD

      // Check if we're currently on the token setup route
      const isTokenSetupRoute = window.location.pathname.startsWith('/id/');

      console.log('[JWT Check] Checking token expiration...');
      console.log('[JWT Check] Token exists:', !!token);
      console.log('[JWT Check] On token setup route:', isTokenSetupRoute);

=======
      
      // Check if we're currently on the token setup route
      const isTokenSetupRoute = window.location.pathname.startsWith('/id/');
      
      console.log('[JWT Check] Checking token expiration...');
      console.log('[JWT Check] Token exists:', !!token);
      console.log('[JWT Check] On token setup route:', isTokenSetupRoute);
      
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      if (!token) {
        if (isTokenSetupRoute) {
          console.log('[JWT Check] On token setup route, skipping redirect');
          return;
        }
        console.log('[JWT Check] No JWT token found in localStorage');
        return;
      }
<<<<<<< HEAD

      try {
        const expired = isTokenExpired(token);
        console.log('[JWT Check] Token expired:', expired);

=======
      
      try {
        const expired = isTokenExpired(token);
        console.log('[JWT Check] Token expired:', expired);
        
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
        if (expired) {
          if (isTokenSetupRoute) {
            console.log('[JWT Check] Token expired but on token setup route, skipping redirect');
            return;
          }
<<<<<<< HEAD

          console.log('[JWT Check] Token expired, redirecting to authentication service');

=======
          
          console.log('[JWT Check] Token expired, redirecting to authentication service');
          
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
          // Clear all localStorage data related to authentication
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('role');
          localStorage.removeItem('org_id');
          localStorage.removeItem('leave_year');
<<<<<<< HEAD

=======
          
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
          // Redirect to authentication service based on plan status
          redirectToLogin();
        }
      } catch (error) {
        if (isTokenSetupRoute) {
          console.log('[JWT Check] Error parsing token but on token setup route, skipping redirect');
          return;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
        console.error('[JWT Check] Error checking token expiration:', error);
        // On error parsing token, treat as expired
        console.log('[JWT Check] Invalid token format, redirecting to authentication service');
        localStorage.removeItem('jwt_token');
        redirectToLogin();
      }
    };
<<<<<<< HEAD

    // Check immediately on mount
    checkTokenExpiration();

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

=======
    
    // Check immediately on mount
    checkTokenExpiration();
    
    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    // Also check on focus (when user returns to tab)
    const handleFocus = () => {
      console.log('[JWT Check] Tab focused, checking token expiration');
      checkTokenExpiration();
    };
<<<<<<< HEAD

    window.addEventListener('focus', handleFocus);

=======
    
    window.addEventListener('focus', handleFocus);
    
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
};
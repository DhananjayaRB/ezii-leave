import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { decodeJWT, storeUserDataFromToken } from "@/lib/jwtUtils";

export default function TokenHandler() {
  const [match, params] = useRoute("/id/:token");
  const [, setLocation] = useLocation();

  console.log('[TokenHandler] Component rendered - match:', match, 'params:', params);
  console.log('[TokenHandler] Route pattern: /id/:token');
  console.log('[TokenHandler] Window location:', window.location.pathname);

  useEffect(() => {
    console.log('[TokenHandler] useEffect - match:', match, 'params:', params);
    console.log('[TokenHandler] Current location:', window.location.pathname);
    
    if (match && params?.token) {
      console.log('[TokenHandler] Processing token:', params.token);
      
      // Decode the JWT token
      const payload = decodeJWT(params.token);
      
      if (payload) {
        console.log('Decoded JWT payload:', payload);
        
        // Store user data and token in localStorage
        storeUserDataFromToken(payload, params.token).then(() => {
          // Debug: Check what's actually stored after token processing
          console.log('=== TOKEN HANDLER STORAGE DEBUG ===');
          console.log('localStorage keys after storage:', Object.keys(localStorage));
          console.log('org_id:', localStorage.getItem('org_id'));
          console.log('user_id:', localStorage.getItem('user_id'));
          console.log('jwt_token present:', !!localStorage.getItem('jwt_token'));
          console.log('role_name:', localStorage.getItem('role_name'));
          console.log('===================================');
          
          // Redirect to home page - the app will handle setup check
          console.log('Redirecting to home page...');
          setLocation('/');
        });
      } else {
        console.error('Failed to decode JWT token');
        // Redirect to landing page on invalid token
        setLocation('/');
      }
    }
  }, [match, params, setLocation]);

  // Show loading while processing token
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
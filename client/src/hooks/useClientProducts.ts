<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
=======
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

interface ClientProducts {
  orgId: number;
  isCore: boolean;
  isPayroll: boolean;
  isAttendance: boolean;
  isLeave: boolean;
  isExpense: boolean;
}

export function useClientProducts() {
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Get JWT token from localStorage
  useEffect(() => {
<<<<<<< HEAD
    const token = localStorage.getItem("jwt_token");
    setJwtToken(token);
  }, []);

  const {
    data: clientProducts,
    isLoading,
    error,
  } = useQuery<ClientProducts>({
    queryKey: ["client-products"],
    queryFn: async () => {
      if (!jwtToken) {
        throw new Error("No JWT token available");
      }

      console.log("[ClientProducts] Fetching enabled modules from API...");

      const response = await fetch(
        "https://qa-api.resolveindia.com/organization/get-client-products",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.error(
          "[ClientProducts] API request failed:",
          response.status,
          response.statusText,
        );
=======
    const token = localStorage.getItem('jwt_token');
    setJwtToken(token);
  }, []);

  const { data: clientProducts, isLoading, error } = useQuery<ClientProducts>({
    queryKey: ['client-products'],
    queryFn: async () => {
      if (!jwtToken) {
        throw new Error('No JWT token available');
      }

      console.log('[ClientProducts] Fetching enabled modules from API...');
      
      const response = await fetch('https://qa-api.resolveindia.com/organization/get-client-products', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[ClientProducts] API request failed:', response.status, response.statusText);
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
        throw new Error(`Failed to fetch client products: ${response.status}`);
      }

      const data = await response.json();
<<<<<<< HEAD
      console.log("[ClientProducts] Enabled modules:", data);
=======
      console.log('[ClientProducts] Enabled modules:', data);
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      return data;
    },
    enabled: !!jwtToken, // Only run query when we have a JWT token
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  return {
    clientProducts,
    isLoading,
    error,
    hasToken: !!jwtToken,
  };
<<<<<<< HEAD
}
=======
}
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

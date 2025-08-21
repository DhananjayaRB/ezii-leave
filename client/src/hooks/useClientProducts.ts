import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

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
        throw new Error(`Failed to fetch client products: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ClientProducts] Enabled modules:', data);
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
}
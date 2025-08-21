import { useQuery } from '@tanstack/react-query';

interface PlanStatusResponse {
  message: string;
  expiryFlag: boolean;
  isAdmin: boolean;
  isSaas: boolean;
  isPartner: boolean;
  organizationLogo: string;
}

const fetchPlanStatus = async (): Promise<PlanStatusResponse> => {
  const jwtToken = localStorage.getItem('jwt_token');
  
  if (!jwtToken || jwtToken === 'null' || jwtToken === 'undefined' || jwtToken.trim() === '') {
    throw new Error('JWT token not found');
  }

  const response = await fetch('https://qa-api.resolveindia.com/organization/plan-status', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const usePlanStatus = () => {
  return useQuery({
    queryKey: ['plan-status'],
    queryFn: fetchPlanStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (gcTime replaces cacheTime in v5)
    retry: 2,
    enabled: !!localStorage.getItem('jwt_token'), // Only run if JWT token exists
  });
};
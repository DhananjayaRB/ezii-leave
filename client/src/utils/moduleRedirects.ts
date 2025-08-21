// Module redirect utility based on plan status
export const getModuleRedirectUrl = (moduleId: string, isSaas: boolean): string => {
  const baseUrl = isSaas ? 'https://qa.ezii.co.in' : 'https://qa.resolveindia.com';
  
  switch (moduleId) {
    case 'core':
      return `${baseUrl}/company-setup-for-customer`;
    case 'payroll':
      return `${baseUrl}/dashboard/team-dashboard/team-dashboard`;
    default:
      return baseUrl;
  }
};

export const redirectToModule = (moduleId: string, isSaas: boolean): void => {
  const url = getModuleRedirectUrl(moduleId, isSaas);
  window.location.href = url;
};

// Login string API response interface
interface LoginStringResponse {
  result: string;
  statuscode: string;
  message: string;
  redirectUrl?: string;
}

// Fetch login string for attendance and expense modules
export const fetchLoginString = async (moduleId: string): Promise<LoginStringResponse> => {
  const jwtToken = localStorage.getItem('jwt_token');
  
  if (!jwtToken || jwtToken === 'null' || jwtToken === 'undefined' || jwtToken.trim() === '') {
    throw new Error('JWT token not found');
  }

  // Map module to API endpoint number
  const moduleMap: Record<string, number> = {
    attendance: 5,
    expense: 2
  };

  const moduleNumber = moduleMap[moduleId];
  if (!moduleNumber) {
    throw new Error(`Unsupported module: ${moduleId}`);
  }

  const response = await fetch(`https://qa-api.resolveindia.com/organization/login-string/${moduleNumber}/Qa`, {
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

// Handle attendance and expense module redirects
export const redirectToLoginModule = async (moduleId: string): Promise<void> => {
  try {
    console.log(`[Module Click] ${moduleId} clicked, fetching login string...`);
    
    const response = await fetchLoginString(moduleId);
    
    if (response.statuscode === "200") {
      if (response?.redirectUrl) {
        const oldPlatformUrl = "https://rc.resolveindia.in/";
        const fullUrl = `${oldPlatformUrl}${response.redirectUrl}`;
        console.log(`[Module Click] Redirecting to: ${fullUrl}`);
        window.location.href = fullUrl;
      } else {
        console.error(`[Module Click] No redirect URL in response for ${moduleId}`);
        alert("Access Denied, please contact your Organisation!");
      }
    } else {
      console.error(`[Module Click] Invalid status code: ${response.statuscode}`);
      alert("Access Denied, please contact your Organisation!");
    }
  } catch (error) {
    console.error(`[Module Click] Error accessing ${moduleId}:`, error);
    alert("Access Denied, please contact your Organisation!");
  }
};
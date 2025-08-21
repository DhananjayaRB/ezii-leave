// Module redirect utility based on plan status
<<<<<<< HEAD
export const getModuleRedirectUrl = (
  moduleId: string,
  isSaas: boolean,
): string => {
  const baseUrl = isSaas
    ? "https://qa.ezii.co.in"
    : "https://qa.resolveindia.com";

  switch (moduleId) {
    case "core":
      return `${baseUrl}/company-setup-for-customer`;
    case "payroll":
=======
export const getModuleRedirectUrl = (moduleId: string, isSaas: boolean): string => {
  const baseUrl = isSaas ? 'https://qa.ezii.co.in' : 'https://qa.resolveindia.com';
  
  switch (moduleId) {
    case 'core':
      return `${baseUrl}/company-setup-for-customer`;
    case 'payroll':
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
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
<<<<<<< HEAD
export const fetchLoginString = async (
  moduleId: string,
): Promise<LoginStringResponse> => {
  const jwtToken = localStorage.getItem("jwt_token");

  if (
    !jwtToken ||
    jwtToken === "null" ||
    jwtToken === "undefined" ||
    jwtToken.trim() === ""
  ) {
    throw new Error("JWT token not found");
=======
export const fetchLoginString = async (moduleId: string): Promise<LoginStringResponse> => {
  const jwtToken = localStorage.getItem('jwt_token');
  
  if (!jwtToken || jwtToken === 'null' || jwtToken === 'undefined' || jwtToken.trim() === '') {
    throw new Error('JWT token not found');
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  }

  // Map module to API endpoint number
  const moduleMap: Record<string, number> = {
    attendance: 5,
<<<<<<< HEAD
    expense: 2,
=======
    expense: 2
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
  };

  const moduleNumber = moduleMap[moduleId];
  if (!moduleNumber) {
    throw new Error(`Unsupported module: ${moduleId}`);
  }

<<<<<<< HEAD
  const response = await fetch(
    `https://qa-api.resolveindia.com/organization/login-string/${moduleNumber}/Qa`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    },
  );
=======
  const response = await fetch(`https://qa-api.resolveindia.com/organization/login-string/${moduleNumber}/Qa`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  });
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Handle attendance and expense module redirects
<<<<<<< HEAD
export const redirectToLoginModule = async (
  moduleId: string,
): Promise<void> => {
  try {
    console.log(`[Module Click] ${moduleId} clicked, fetching login string...`);

    const response = await fetchLoginString(moduleId);

=======
export const redirectToLoginModule = async (moduleId: string): Promise<void> => {
  try {
    console.log(`[Module Click] ${moduleId} clicked, fetching login string...`);
    
    const response = await fetchLoginString(moduleId);
    
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
    if (response.statuscode === "200") {
      if (response?.redirectUrl) {
        const oldPlatformUrl = "https://rc.resolveindia.in/";
        const fullUrl = `${oldPlatformUrl}${response.redirectUrl}`;
        console.log(`[Module Click] Redirecting to: ${fullUrl}`);
        window.location.href = fullUrl;
      } else {
<<<<<<< HEAD
        console.error(
          `[Module Click] No redirect URL in response for ${moduleId}`,
        );
        alert("Access Denied, please contact your Organisation!");
      }
    } else {
      console.error(
        `[Module Click] Invalid status code: ${response.statuscode}`,
      );
=======
        console.error(`[Module Click] No redirect URL in response for ${moduleId}`);
        alert("Access Denied, please contact your Organisation!");
      }
    } else {
      console.error(`[Module Click] Invalid status code: ${response.statuscode}`);
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0
      alert("Access Denied, please contact your Organisation!");
    }
  } catch (error) {
    console.error(`[Module Click] Error accessing ${moduleId}:`, error);
    alert("Access Denied, please contact your Organisation!");
  }
<<<<<<< HEAD
};
=======
};
>>>>>>> 86b9e613a1c56dccd44b752e2920391633e6ebe0

interface JWTPayload {
  org_id: string;
  user_id: string;
  role_id: string;
  user_type_id: string;
  role_name: string;
  nbf: number;
  exp: number;
  iss: string;
  aud: string;
}

const JWT_TOKEN_KEY = 'jwt_token';

export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode from base64
    const decodedPayload = atob(paddedPayload);
    
    // Parse JSON
    const parsedPayload = JSON.parse(decodedPayload) as JWTPayload;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (parsedPayload.exp && currentTime > parsedPayload.exp) {
      console.warn('JWT token has expired');
      return null;
    }

    return parsedPayload;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

export async function storeUserDataFromToken(payload: JWTPayload, token: string): Promise<void> {
  // Use OrgContext to store JWT data consistently
  const { OrgContext } = await import('./orgContext');
  
  // Check if user_id was manually set in localStorage - if so, preserve it
  const existingUserId = localStorage.getItem('user_id');
  const userIdToStore = existingUserId || payload.user_id;
  
  console.log('=== JWT STORAGE DEBUG ===');
  console.log('JWT payload user_id:', payload.user_id);
  console.log('Storing user_id as:', userIdToStore);
  
  OrgContext.setJWTData({
    org_id: payload.org_id,
    user_id: userIdToStore,
    role_id: payload.role_id,
    role_name: payload.role_name,
    user_type_id: payload.user_type_id
  });
  
  // Store the raw JWT token for API authorization
  localStorage.setItem(JWT_TOKEN_KEY, token);
  localStorage.setItem('jwt_token', token); // Also store with explicit key
  
  console.log('Stored JWT token with key:', JWT_TOKEN_KEY);
  console.log('Token stored successfully:', !!localStorage.getItem('jwt_token'));
  console.log('Final stored user_id:', localStorage.getItem('user_id'));
  console.log('Stored user data from JWT:', {
    org_id: payload.org_id,
    user_id: userIdToStore,
    role_id: payload.role_id,
    role_name: payload.role_name
  });
  console.log('========================');
}

export function getStoredJWTToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check the correct JWT token key
  return localStorage.getItem('jwt_token') || localStorage.getItem(JWT_TOKEN_KEY);
}

export async function clearUserData(): Promise<void> {
  const { OrgContext } = await import('./orgContext');
  OrgContext.clear();
}
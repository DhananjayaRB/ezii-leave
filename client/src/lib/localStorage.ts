// LocalStorage utility functions for user data

export const USER_ID_KEY = 'user_id';

// Store user ID in localStorage
export const setUserId = (userId: string): void => {
  try {
    localStorage.setItem(USER_ID_KEY, userId);
  } catch (error) {
    console.error('Failed to store user ID in localStorage:', error);
  }
};

// Get user ID from localStorage
export const getUserId = (): string | null => {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.error('Failed to get user ID from localStorage:', error);
    return null;
  }
};

// Remove user ID from localStorage
export const removeUserId = (): void => {
  try {
    localStorage.removeItem(USER_ID_KEY);
  } catch (error) {
    console.error('Failed to remove user ID from localStorage:', error);
  }
};

// Check if user ID exists in localStorage
export const hasUserId = (): boolean => {
  return getUserId() !== null;
};

// Initialize with defaults only if user_id doesn't exist (preserve manual changes)
export const initializeUserId = (): void => {
  // Only set default if no user_id exists - preserve manual localStorage changes
  if (!localStorage.getItem('user_id')) {
    setUserId('14674');
    console.log('🔄 No user_id found, set default to 14674');
  }
  
  // Ensure all required localStorage values are set (only if missing)
  if (!localStorage.getItem('org_id')) {
    localStorage.setItem('org_id', '60');
  }
  
  if (!localStorage.getItem('role')) {
    localStorage.setItem('role', 'admin');
  }
};